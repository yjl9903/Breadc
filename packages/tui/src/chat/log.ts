import { gray, cyan, yellow, red } from '@breadc/color';

import type { LogEntry, LogLevel } from './types.ts';

const LOG_LEVEL_PREFIX: Record<LogLevel, string> = {
  log: 'LOG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR'
};

const LOG_LEVEL_COLOR: Record<LogLevel, (text: string) => string> = {
  log: gray,
  info: cyan,
  warn: yellow,
  error: red
};

export interface LogFormatterOptions {
  tag?: string;

  columns: number;

  isTTY: boolean;
}

export function defaultLogFormatter(entry: LogEntry, options: LogFormatterOptions): string {
  if (entry.level === 'log') {
    return entry.message;
  }
  if (options.isTTY) {
    const color = LOG_LEVEL_COLOR[entry.level];
    const prefix = color(`[${LOG_LEVEL_PREFIX[entry.level]}]`);
    return `${prefix} ${entry.message}`;
  } else {
    return `[${LOG_LEVEL_PREFIX[entry.level]}] ${entry.message}`;
  }
}
