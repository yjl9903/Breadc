import type { Writable } from 'node:stream';

import readline from 'node:readline';
import { format } from 'node:util';

import { defaultLogFormatter } from './log.ts';
import {
  normalizeProgressValue,
  numericOrDefault,
  renderPercent,
  renderProgressBar,
  renderTemplateLines
} from './helpers.ts';

import type { AnyState, LogEntry, LogLevel, OutputStream } from './types.ts';

import type {
  ProgressWidgetOptions,
  ProgressWidgetState,
  SpinnerWidgetOptions,
  SpinnerWidgetState,
  WidgetFields,
  WidgetHandle,
  WidgetSpec,
  WidgetTemplate,
  RenderContext
} from './widget.ts';

interface RenderWidget<S extends AnyState = AnyState> {
  id: string;
  state: S;
  template: WidgetTemplate<S>;
  fields: WidgetFields<S>;
}

const DEFAULT_SPINNER_FRAMES = ['-', '\\', '|', '/'];
const DEFAULT_TICK_INTERVAL = 80;
const DEFAULT_NON_TTY_INTERVAL = 1000;
const DEFAULT_PROGRESS_WIDTH = 24;

export interface ChatTUIOptions {
  stream?: Writable & { isTTY?: boolean; columns?: number };

  tickInterval?: number;

  nonTTYInterval?: number;

  log?: {
    format?: (entry: LogEntry) => string;
  };
}

export interface Chat {
  log(...args: unknown[]): void;

  info(...args: unknown[]): void;

  warn(...args: unknown[]): void;

  error(...args: unknown[]): void;

  widget<S extends AnyState>(spec: WidgetSpec<S>): WidgetHandle<S>;

  spinner<S extends AnyState = AnyState>(
    message: string,
    options?: SpinnerWidgetOptions<S>
  ): WidgetHandle<SpinnerWidgetState & S>;

  progress<S extends AnyState = AnyState>(
    message: string,
    options?: ProgressWidgetOptions<S>
  ): WidgetHandle<ProgressWidgetState & S>;

  render(force?: boolean): void;

  clearBottom(): void;

  dispose(): void;
}

export function chat(options: ChatTUIOptions = {}): Chat {
  const stream = (options.stream ?? process.stderr) as OutputStream;
  const isTTY = !!stream.isTTY;
  const tickInterval = Math.max(1, options.tickInterval ?? DEFAULT_TICK_INTERVAL);
  const nonTTYInterval = Math.max(0, options.nonTTYInterval ?? DEFAULT_NON_TTY_INTERVAL);

  const widgets: RenderWidget[] = [];

  let tick = 0;
  let disposed = false;
  let idCounter = 0;
  let prevBottomCount = 0;
  let scheduled = false;
  let queuedForce = false;
  let ticker: NodeJS.Timeout | undefined;
  let lastNonTTYRender = 0;

  const createId = () => {
    idCounter += 1;
    return `widget-${idCounter}`;
  };

  const stopTicker = () => {
    if (!ticker) {
      return;
    }
    clearInterval(ticker);
    ticker = undefined;
  };

  const ensureTicker = () => {
    if (ticker || disposed || widgets.length === 0) {
      return;
    }

    ticker = setInterval(() => {
      if (disposed || widgets.length === 0) {
        stopTicker();
        return;
      }

      tick += 1;
      scheduleRender(false);
    }, tickInterval);
  };

  const clearBottomTTY = () => {
    if (!isTTY || prevBottomCount === 0) {
      return;
    }

    if (prevBottomCount > 1) {
      readline.moveCursor(stream as NodeJS.WriteStream, 0, -(prevBottomCount - 1));
    }

    readline.cursorTo(stream as NodeJS.WriteStream, 0);
    readline.clearScreenDown(stream as NodeJS.WriteStream);
    prevBottomCount = 0;
  };

  const renderWidgets = () => {
    const lines: string[] = [];
    for (const widget of widgets) {
      const context: RenderContext<any> = {
        tick,
        state: widget.state,
        fields: {}
      };

      const resolvedValues = {
        ...widget.state
      };

      for (const [key, resolver] of Object.entries(widget.fields)) {
        resolvedValues[key] = resolver(context);
      }

      resolvedValues.tick = tick;

      lines.push(...renderTemplateLines(widget.template, context, resolvedValues));
    }
    return lines;
  };

  const drawBottomTTY = () => {
    const lines = renderWidgets();
    if (lines.length === 0) {
      prevBottomCount = 0;
      return;
    }

    for (let i = 0; i < lines.length; i += 1) {
      stream.write(lines[i]);
      if (i < lines.length - 1) {
        stream.write('\n');
      }
    }

    prevBottomCount = lines.length;
  };

  const drawBottomNonTTY = (force: boolean) => {
    const now = Date.now();
    if (!force && now - lastNonTTYRender < nonTTYInterval) {
      return;
    }

    const lines = renderWidgets();
    if (lines.length === 0) {
      return;
    }

    for (const line of lines) {
      stream.write(`${line}\n`);
    }

    lastNonTTYRender = now;
  };

  const render = (force = false) => {
    if (disposed) {
      return;
    }

    if (isTTY) {
      clearBottomTTY();
      drawBottomTTY();
      return;
    }

    drawBottomNonTTY(force);
  };

  const scheduleRender = (force = false) => {
    if (disposed) {
      return;
    }

    queuedForce = queuedForce || force;
    if (scheduled) {
      return;
    }

    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      const shouldForce = queuedForce;
      queuedForce = false;
      render(shouldForce);
    });
  };

  const writeLog = (level: LogLevel, args: unknown[]) => {
    if (disposed) {
      return;
    }

    const entry: LogEntry = {
      level,
      message: format(...args),
      createdAt: new Date()
    };

    const line = options.log?.format ? options.log?.format(entry) : defaultLogFormatter(entry);

    if (isTTY) {
      clearBottomTTY();
    }

    stream.write(`${line}\n`);

    if (isTTY) {
      drawBottomTTY();
    }
  };

  const createWidget = <S extends AnyState>(spec: WidgetSpec<S>): WidgetHandle<S> => {
    const widget: RenderWidget<S> = {
      id: createId(),
      state: { ...spec.state },
      template: spec.template,
      fields: { ...(spec.fields ?? {}) }
    };

    widgets.push(widget as RenderWidget);
    ensureTicker();
    scheduleRender(true);

    const handle: WidgetHandle<S> = {
      id: widget.id,
      setState(next) {
        if (disposed || !widgets.includes(widget as RenderWidget)) {
          return handle;
        }

        const patch = typeof next === 'function' ? next({ ...widget.state }) : next;
        widget.state = { ...widget.state, ...patch };
        scheduleRender(false);
        return handle;
      },
      setTemplate(template) {
        if (disposed || !widgets.includes(widget as RenderWidget)) {
          return handle;
        }

        widget.template = template;
        scheduleRender(false);
        return handle;
      },
      setFields(fields) {
        if (disposed || !widgets.includes(widget as RenderWidget)) {
          return handle;
        }

        widget.fields = { ...widget.fields, ...fields };
        scheduleRender(false);
        return handle;
      },
      remove() {
        if (disposed) {
          return;
        }

        const index = widgets.indexOf(widget as RenderWidget);
        if (index === -1) {
          return;
        }

        widgets.splice(index, 1);
        if (widgets.length === 0) {
          stopTicker();
        }
        scheduleRender(true);
      }
    };

    return handle;
  };

  const createSpinnerWidget = <S extends AnyState = AnyState>(
    message: string,
    spinnerOptions: SpinnerWidgetOptions<S> = {}
  ): WidgetHandle<SpinnerWidgetState & S> => {
    const frames = spinnerOptions.frames?.length ? spinnerOptions.frames : DEFAULT_SPINNER_FRAMES;
    const template = spinnerOptions.template ?? '{frame} {message}';

    const fields: WidgetFields<SpinnerWidgetState & S> = {
      frame: (ctx) => {
        if (frames.length === 0) {
          return '';
        }
        return frames[ctx.tick % frames.length];
      },
      ...(spinnerOptions.fields ?? {})
    };

    return createWidget<SpinnerWidgetState & S>({
      state: {
        message,
        ...(spinnerOptions.state ?? ({} as S))
      },
      template,
      fields
    });
  };

  const createProgressWidget = <S extends AnyState = AnyState>(
    message: string,
    progressOptions: ProgressWidgetOptions<S> = {}
  ): WidgetHandle<ProgressWidgetState & S> => {
    const width = Math.max(1, progressOptions.width || DEFAULT_PROGRESS_WIDTH);
    const complete = progressOptions.complete ?? '=';
    const incomplete = progressOptions.incomplete ?? '-';
    const template = progressOptions.template ?? '{message} [{bar}] {percent}% {value}/{total}';

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
      ...(progressOptions.fields ?? {})
    };

    return createWidget<ProgressWidgetState & S>({
      state: {
        message,
        value: progressOptions.value ?? 0,
        total: progressOptions.total ?? 100,
        ...(progressOptions.state ?? ({} as S))
      },
      template,
      fields
    });
  };

  return {
    log(...args: unknown[]) {
      writeLog('log', args);
    },
    info(...args: unknown[]) {
      writeLog('info', args);
    },
    warn(...args: unknown[]) {
      writeLog('warn', args);
    },
    error(...args: unknown[]) {
      writeLog('error', args);
    },
    widget: createWidget,
    spinner: createSpinnerWidget,
    progress: createProgressWidget,
    render,
    clearBottom() {
      if (disposed) {
        return;
      }

      if (isTTY) {
        clearBottomTTY();
      }
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      stopTicker();
      widgets.length = 0;

      if (isTTY) {
        clearBottomTTY();
      }
    }
  };
}
