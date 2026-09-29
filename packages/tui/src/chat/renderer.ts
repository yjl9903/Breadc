import type { OutputStream, Span } from '../render/types.ts';

import { measureText } from '../render/buffer.ts';
import { InlineRenderer } from '../render/renderer.ts';

import type { AnyState } from './types.ts';
import type {
  CreateWidgetOptions,
  ProgressWidgetOptions,
  ProgressWidgetState,
  RenderContext,
  SpinnerWidgetOptions,
  SpinnerWidgetState,
  WidgetFields,
  WidgetHandle,
  WidgetSpec,
  WidgetTemplate
} from './widget.ts';

import { ansiToSpans } from './ansi.ts';
import { renderPercent, renderProgressBar, renderTemplateLines } from './helpers.ts';

interface RenderWidget<S extends AnyState = AnyState> {
  id: string;
  state: S;
  template: WidgetTemplate<S>;
  fields: WidgetFields<S>;
}

const DEFAULT_SPINNER_FRAMES = ['-', '\\', '|', '/'];
const DEFAULT_PROGRESS_WIDTH = 24;

export interface RendererOptions {
  stream: OutputStream;
  isTTY: boolean;
  tickInterval: number;
  nonTTYInterval: number;
}

/** Widget state, animation scheduling, and composition over InlineRenderer. */
export class Renderer {
  public readonly stream: OutputStream;

  public readonly isTTY: boolean;

  public readonly surface: InlineRenderer;

  private readonly tickInterval: number;

  private readonly nonTTYInterval: number;

  private readonly widgets: RenderWidget[] = [];

  private bottomWidget: RenderWidget | undefined;

  private tick = 0;

  private disposed = false;

  private idCounter = 0;

  private scheduled = false;

  private queuedForce = false;

  private ticker: NodeJS.Timeout | undefined;

  private lastNonTTYRender = 0;

  constructor(options: RendererOptions) {
    this.stream = options.stream;
    this.isTTY = options.isTTY;
    this.tickInterval = options.tickInterval;
    this.nonTTYInterval = options.nonTTYInterval;
    this.surface = new InlineRenderer({
      stream: options.stream,
      isTTY: options.isTTY,
      onExit: () => this.dispose()
    });
  }

  writeAboveBottom(line: string) {
    if (this.disposed) {
      return;
    }

    if (!this.isTTY) {
      this.stream.write(`${line}\n`);
      return;
    }

    if (!this.hasAnyWidget()) {
      this.drawBottomTTY(false);
      this.stream.write(`${line}\n`);
      return;
    }

    this.surface.batch(() => {
      this.surface.resize();
      const spans = ansiToSpans(line);
      if (spans.length === 0) {
        this.surface.insertBefore(1, () => {});
      } else {
        this.surface.commit(spans);
      }
      this.drawBottomTTY(false);
    });
  }

  createWidget<S extends AnyState>(spec: WidgetSpec<S>, options: CreateWidgetOptions = {}): WidgetHandle<S> {
    const widget: RenderWidget<S> = {
      id: this.createId(),
      state: { ...spec.state },
      template: spec.template,
      fields: { ...spec.fields }
    };

    if (options.fixedBottom) {
      this.bottomWidget = widget as RenderWidget;
    } else {
      this.widgets.push(widget as RenderWidget);
    }

    this.ensureTicker();
    this.scheduleRender(true);

    const handle: WidgetHandle<S> = {
      id: widget.id,
      setState: (next) => {
        if (this.disposed || !this.hasWidget(widget as RenderWidget)) {
          return handle;
        }
        const patch = typeof next === 'function' ? next({ ...widget.state }) : next;
        widget.state = { ...widget.state, ...patch };
        this.scheduleRender(false);
        return handle;
      },
      setTemplate: (template) => {
        if (this.disposed || !this.hasWidget(widget as RenderWidget)) {
          return handle;
        }
        widget.template = template;
        this.scheduleRender(false);
        return handle;
      },
      setFields: (fields) => {
        if (this.disposed || !this.hasWidget(widget as RenderWidget)) {
          return handle;
        }
        widget.fields = { ...widget.fields, ...fields };
        this.scheduleRender(false);
        return handle;
      },
      remove: () => {
        if (!this.disposed) {
          this.removeWidget(widget as RenderWidget);
        }
      }
    };

    return handle;
  }

  createSpinnerWidget<S extends AnyState = AnyState>(
    message: string,
    options: SpinnerWidgetOptions<S> = {}
  ): WidgetHandle<SpinnerWidgetState & S> {
    const frames = options.frames?.length ? options.frames : DEFAULT_SPINNER_FRAMES;
    const fields: WidgetFields<SpinnerWidgetState & S> = {
      frame: (ctx) => frames[ctx.tick % frames.length],
      ...options.fields
    };

    return this.createWidget<SpinnerWidgetState & S>(
      {
        state: { message, ...(options.state ?? ({} as S)) },
        template: options.template ?? '{frame} {message}',
        fields
      },
      { fixedBottom: options.fixedBottom }
    );
  }

  createProgressWidget<S extends AnyState = AnyState>(
    message: string,
    options: ProgressWidgetOptions<S> = {}
  ): WidgetHandle<ProgressWidgetState & S> {
    const width = Math.max(1, options.width ?? DEFAULT_PROGRESS_WIDTH);
    const complete = options.complete ?? '\u2588';
    const incomplete = options.incomplete ?? '\u2591';
    const fields: WidgetFields<ProgressWidgetState & S> = {
      bar: (ctx) => renderProgressBar(ctx.state.value, ctx.state.total, { width, complete, incomplete }),
      percent: (ctx) => renderPercent(ctx.state.value, ctx.state.total),
      ...options.fields
    };

    return this.createWidget<ProgressWidgetState & S>(
      {
        state: {
          message,
          value: options.value ?? 0,
          total: options.total ?? 100,
          ...(options.state ?? ({} as S))
        },
        template: options.template ?? '{message} [{bar}] {percent}% {value}/{total}',
        fields
      },
      { fixedBottom: options.fixedBottom }
    );
  }

  render(force = false) {
    if (this.disposed) {
      return;
    }
    if (this.isTTY) {
      this.drawBottomTTY(force);
    } else {
      this.drawBottomNonTTY(force);
    }
  }

  clearBottom() {
    if (!this.disposed && this.isTTY) {
      this.surface.release();
    }
  }

  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.stopTicker();
    this.widgets.length = 0;
    this.bottomWidget = undefined;
    this.surface.dispose();
  }

  private createId() {
    this.idCounter += 1;
    return `widget-${this.idCounter}`;
  }

  private ensureTicker() {
    if (this.ticker || this.disposed) {
      return;
    }
    this.ticker = setInterval(() => {
      this.tick += 1;
      this.scheduleRender(false);
    }, this.tickInterval);
  }

  private stopTicker() {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = undefined;
    }
  }

  private renderWidgets(widgets = this.bottomWidget ? [...this.widgets, this.bottomWidget] : this.widgets) {
    const lines: string[] = [];
    for (const widget of widgets) {
      const context: RenderContext = { tick: this.tick, state: widget.state, fields: {} };
      const resolvedValues: Record<string, unknown> = { ...widget.state, tick: this.tick };
      for (const [key, resolver] of Object.entries(widget.fields)) {
        resolvedValues[key] = resolver(context);
      }
      lines.push(...renderTemplateLines(widget.template, context, resolvedValues));
    }
    return lines;
  }

  private drawBottomTTY(force: boolean) {
    const lines = this.renderWidgets(this.widgets);
    const bottomLines = this.bottomWidget ? this.renderWidgets([this.bottomWidget]) : [];
    this.surface.batch(() => {
      this.surface.resize();
      if (lines.length === 0 && bottomLines.length === 0) {
        this.surface.setViewportHeight(1);
        this.surface.release();
        return;
      }

      const width = this.surface.area.width;
      const content = ansiToSpans(lines.join('\n'));
      const bottomContent = ansiToSpans(bottomLines.join('\n'));
      const bottomHeight = measureLines(bottomLines, bottomContent, width);
      const height = measureLines(lines, content, width) + bottomHeight;
      if (force) {
        this.surface.clear();
      }
      this.surface.setViewportHeight(height);
      this.surface.render((frame) => {
        const bottomStart = Math.max(0, frame.area.height - bottomHeight);
        if (lines.length > 0) {
          frame.write(content, { height: bottomStart });
        }
        if (bottomLines.length > 0) {
          frame.write(bottomContent, { y: bottomStart, height: frame.area.height - bottomStart });
        }
      });
    });
  }

  private drawBottomNonTTY(force: boolean) {
    const now = Date.now();
    if (!force && now - this.lastNonTTYRender < this.nonTTYInterval) {
      return;
    }
    for (const line of this.renderWidgets()) {
      this.stream.write(`${line}\n`);
    }
    this.lastNonTTYRender = now;
  }

  private hasAnyWidget() {
    return this.widgets.length > 0 || this.bottomWidget !== undefined;
  }

  private hasWidget(widget: RenderWidget) {
    return this.bottomWidget === widget || this.widgets.includes(widget);
  }

  private removeWidget(widget: RenderWidget) {
    const index = this.widgets.indexOf(widget);
    if (index !== -1) {
      this.widgets.splice(index, 1);
    } else if (this.bottomWidget === widget) {
      this.bottomWidget = undefined;
    } else {
      return;
    }
    if (!this.hasAnyWidget()) {
      this.stopTicker();
    }
    this.scheduleRender(true);
  }

  private scheduleRender(force: boolean) {
    if (this.disposed) {
      return;
    }
    this.queuedForce = this.queuedForce || force;
    if (this.scheduled) {
      return;
    }
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      const shouldForce = this.queuedForce;
      this.queuedForce = false;
      this.render(shouldForce);
    });
  }
}

function measureLines(lines: string[], content: Span[], width: number) {
  return lines.length > 0 ? Math.max(1, measureText(content, width).rows) : 0;
}
