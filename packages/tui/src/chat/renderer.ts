import readline from 'node:readline';

import {
  normalizeProgressValue,
  numericOrDefault,
  renderPercent,
  renderProgressBar,
  renderTemplateLines
} from './helpers.ts';

import type { AnyState, OutputStream } from './types.ts';
import type {
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

export class Renderer {
  private readonly stream: OutputStream;

  private readonly isTTY: boolean;

  private readonly tickInterval: number;

  private readonly nonTTYInterval: number;

  private readonly widgets: RenderWidget[] = [];

  private tick = 0;

  private disposed = false;

  private idCounter = 0;

  private prevBottomCount = 0;

  private scheduled = false;

  private queuedForce = false;

  private ticker: NodeJS.Timeout | undefined;

  private lastNonTTYRender = 0;

  constructor(options: RendererOptions) {
    this.stream = options.stream;
    this.isTTY = options.isTTY;
    this.tickInterval = options.tickInterval;
    this.nonTTYInterval = options.nonTTYInterval;
  }

  writeAboveBottom(line: string) {
    if (this.disposed) {
      return;
    }

    if (this.isTTY) {
      this.clearBottomTTY();
    }

    this.stream.write(`${line}\n`);

    if (this.isTTY) {
      this.drawBottomTTY();
    }
  }

  createWidget<S extends AnyState>(spec: WidgetSpec<S>): WidgetHandle<S> {
    const widget: RenderWidget<S> = {
      id: this.createId(),
      state: { ...spec.state },
      template: spec.template,
      fields: { ...(spec.fields ?? {}) }
    };

    this.widgets.push(widget as RenderWidget);
    this.ensureTicker();
    this.scheduleRender(true);

    const handle: WidgetHandle<S> = {
      id: widget.id,
      setState: (next) => {
        if (this.disposed || !this.widgets.includes(widget as RenderWidget)) {
          return handle;
        }

        const patch = typeof next === 'function' ? next({ ...widget.state }) : next;
        widget.state = { ...widget.state, ...patch };
        this.scheduleRender(false);
        return handle;
      },
      setTemplate: (template) => {
        if (this.disposed || !this.widgets.includes(widget as RenderWidget)) {
          return handle;
        }

        widget.template = template;
        this.scheduleRender(false);
        return handle;
      },
      setFields: (fields) => {
        if (this.disposed || !this.widgets.includes(widget as RenderWidget)) {
          return handle;
        }

        widget.fields = { ...widget.fields, ...fields };
        this.scheduleRender(false);
        return handle;
      },
      remove: () => {
        if (this.disposed) {
          return;
        }

        const index = this.widgets.indexOf(widget as RenderWidget);
        if (index === -1) {
          return;
        }

        this.widgets.splice(index, 1);
        if (this.widgets.length === 0) {
          this.stopTicker();
        }
        this.scheduleRender(true);
      }
    };

    return handle;
  }

  createSpinnerWidget<S extends AnyState = AnyState>(
    message: string,
    options: SpinnerWidgetOptions<S> = {}
  ): WidgetHandle<SpinnerWidgetState & S> {
    const frames = options.frames?.length ? options.frames : DEFAULT_SPINNER_FRAMES;
    const template = options.template ?? '{frame} {message}';

    const fields: WidgetFields<SpinnerWidgetState & S> = {
      frame: (ctx) => {
        if (frames.length === 0) {
          return '';
        }
        return frames[ctx.tick % frames.length];
      },
      ...(options.fields ?? {})
    };

    return this.createWidget<SpinnerWidgetState & S>({
      state: {
        message,
        ...(options.state ?? ({} as S))
      },
      template,
      fields
    });
  }

  createProgressWidget<S extends AnyState = AnyState>(
    message: string,
    options: ProgressWidgetOptions<S> = {}
  ): WidgetHandle<ProgressWidgetState & S> {
    const width = Math.max(1, options.width || DEFAULT_PROGRESS_WIDTH);
    const complete = options.complete ?? '\u2588';
    const incomplete = options.incomplete ?? '\u2591';

    const template = options.template ?? '{message} [{bar}] {percent}% {value}/{total}';

    const fields: WidgetFields<ProgressWidgetState & S> = {
      bar: (ctx) => {
        const total = numericOrDefault(ctx.state.total, 0);
        const value = normalizeProgressValue(numericOrDefault(ctx.state.value, 0), total);
        return renderProgressBar(value, total, { width, complete, incomplete });
      },
      percent: (ctx) => {
        const total = numericOrDefault(ctx.state.total, 0);
        const value = normalizeProgressValue(numericOrDefault(ctx.state.value, 0), total);
        return renderPercent(value, total);
      },
      ...(options.fields ?? {})
    };

    return this.createWidget<ProgressWidgetState & S>({
      state: {
        message,
        value: options.value ?? 0,
        total: options.total ?? 100,
        ...(options.state ?? ({} as S))
      },
      template,
      fields
    });
  }

  render(force = false) {
    if (this.disposed) {
      return;
    }

    if (this.isTTY) {
      this.clearBottomTTY();
      this.drawBottomTTY();
      return;
    }

    this.drawBottomNonTTY(force);
  }

  clearBottom() {
    if (this.disposed || !this.isTTY) {
      return;
    }
    this.clearBottomTTY();
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.stopTicker();
    this.widgets.length = 0;

    if (this.isTTY) {
      this.clearBottomTTY();
    }
  }

  private createId() {
    this.idCounter += 1;
    return `widget-${this.idCounter}`;
  }

  private stopTicker() {
    if (!this.ticker) {
      return;
    }
    clearInterval(this.ticker);
    this.ticker = undefined;
  }

  private ensureTicker() {
    if (this.ticker || this.disposed || this.widgets.length === 0) {
      return;
    }

    this.ticker = setInterval(() => {
      if (this.disposed || this.widgets.length === 0) {
        this.stopTicker();
        return;
      }

      this.tick += 1;
      this.scheduleRender(false);
    }, this.tickInterval);
  }

  private clearBottomTTY() {
    if (!this.isTTY || this.prevBottomCount === 0) {
      return;
    }

    const output = this.stream as NodeJS.WriteStream;
    if (this.prevBottomCount > 1) {
      readline.moveCursor(output, 0, -(this.prevBottomCount - 1));
    }

    readline.cursorTo(output, 0);
    readline.clearScreenDown(output);
    this.prevBottomCount = 0;
  }

  private renderWidgets() {
    const lines: string[] = [];
    for (const widget of this.widgets) {
      const context: RenderContext<any> = {
        tick: this.tick,
        state: widget.state,
        fields: {}
      };

      const resolvedValues: Record<string, unknown> = {
        ...widget.state,
        tick: this.tick
      };

      for (const [key, resolver] of Object.entries(widget.fields)) {
        resolvedValues[key] = resolver(context);
      }

      lines.push(...renderTemplateLines(widget.template, context, resolvedValues));
    }
    return lines;
  }

  private drawBottomTTY() {
    const lines = this.renderWidgets();
    if (lines.length === 0) {
      this.prevBottomCount = 0;
      return;
    }

    for (let i = 0; i < lines.length; i += 1) {
      this.stream.write(lines[i]);
      if (i < lines.length - 1) {
        this.stream.write('\n');
      }
    }

    this.prevBottomCount = lines.length;
  }

  private drawBottomNonTTY(force: boolean) {
    const now = Date.now();
    if (!force && now - this.lastNonTTYRender < this.nonTTYInterval) {
      return;
    }

    const lines = this.renderWidgets();
    if (lines.length === 0) {
      return;
    }

    for (const line of lines) {
      this.stream.write(`${line}\n`);
    }

    this.lastNonTTYRender = now;
  }

  private scheduleRender(force = false) {
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
