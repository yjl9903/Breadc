import type { Writable } from 'node:stream';

import { format } from 'node:util';

import { Renderer } from './renderer.ts';
import { defaultLogFormatter, LogFormatterOptions } from './log.ts';

import type { AnyState, LogEntry, LogLevel } from './types.ts';

import type {
  CreateWidgetOptions,
  WidgetSpec,
  WidgetHandle,
  SpinnerWidgetOptions,
  SpinnerWidgetState,
  ProgressWidgetOptions,
  ProgressWidgetState
} from './widget.ts';

const DEFAULT_TICK_INTERVAL = 80;

const DEFAULT_NON_TTY_INTERVAL = 1000;

export interface ChatOptions {
  renderer?: Renderer;

  stream?: Writable & { isTTY?: boolean; columns?: number };

  tickInterval?: number;

  nonTTYInterval?: number;

  log?: {
    tag?: string;

    format?: (entry: LogEntry, options: LogFormatterOptions) => string;
  };
}

export interface Chat {
  readonly renderer: Renderer;

  readonly stream: Writable & { isTTY?: boolean; columns?: number };

  readonly options: ChatOptions;

  log(...args: unknown[]): void;

  info(...args: unknown[]): void;

  warn(...args: unknown[]): void;

  error(...args: unknown[]): void;

  widget<S extends AnyState>(spec: WidgetSpec<S>, options?: CreateWidgetOptions): WidgetHandle<S>;

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

export function chat(options: ChatOptions = {}): Chat {
  const stream = options.stream ?? process.stdout;
  const isTTY = !!stream.isTTY;
  const tickInterval = Math.max(1, options.tickInterval ?? DEFAULT_TICK_INTERVAL);
  const nonTTYInterval = Math.max(0, options.nonTTYInterval ?? DEFAULT_NON_TTY_INTERVAL);

  const renderer =
    options.renderer ??
    new Renderer({
      stream,
      isTTY,
      tickInterval,
      nonTTYInterval
    });

  const writeLog = (level: LogLevel, args: unknown[]) => {
    const entry: LogEntry = {
      level,
      message: format(...args),
      createdAt: new Date()
    };

    const opt = { tag: options.log?.tag, columns: stream.columns || 80, isTTY: stream.isTTY || false };
    const line = options.log?.format ? options.log.format(entry, opt) : defaultLogFormatter(entry, opt);
    renderer.writeAboveBottom(line);
  };

  return {
    renderer,
    stream,
    options,
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
    widget: (spec, widgetOptions) => renderer.createWidget(spec, widgetOptions),
    spinner: (message, spinnerOptions) => renderer.createSpinnerWidget(message, spinnerOptions),
    progress: (message, progressOptions) => renderer.createProgressWidget(message, progressOptions),
    render: (force) => renderer.render(force),
    clearBottom: () => renderer.clearBottom(),
    dispose: () => renderer.dispose()
  };
}
