import type { LogLevel, Reporter, FormatOptions } from './types';

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
  private _log(message: string) {
    for (const reporter of this.options.reporter) {
      reporter.print({ message });
    }
  }

  public log(message: string) {
    this._log(message);
  }

  public info(message: string) {
    this._log(message);
  }
}
