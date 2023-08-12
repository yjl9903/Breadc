import type { Reporter, FormatOptions, InputLogObject } from './types';

import { LogLevel } from './level';

export interface LoggerPlugin {}

export interface LoggerOptions {
  reporter: Reporter[];
  level: LogLevel;
  format: FormatOptions;
  stdout?: NodeJS.WriteStream;
  stderr?: NodeJS.WriteStream;
  plugins: LoggerPlugin[];
}

export class BreadcLogger {
  readonly options: LoggerOptions;

  constructor(options: LoggerOptions) {
    this.options = options;
  }

  get level() {
    return this.options.level;
  }

  set level(level) {
    this.options.level = level;
  }

  // --- Log ---
  private print(defaults: InputLogObject, message: string, args: any[]) {
    const date = new Date();
    for (const reporter of this.options.reporter) {
      reporter.print({
        ...defaults,
        level: 0,
        type: 'info',
        date,
        message,
        args
      });
    }
  }

  public log(message: string, ...args: any[]) {
    this.print({}, message, args);
  }

  public info(message: string, ...args: any[]) {
    this.print({}, message, args);
  }
}

export type LogFn = (message: string, ...args: any[]) => void;

export type BreadcLoggerInstance = BreadcLogger & {};
