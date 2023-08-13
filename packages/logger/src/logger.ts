import type {
  InputLogItem,
  InputLogObject,
  LogObject,
  LoggerOptions
} from './types';

import { LogLevels } from './level';

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
  private shouldPrint(obj: LogObject) {
    return obj.level <= this.level;
  }

  private print(defaults: InputLogObject, input: InputLogObject) {
    const date = new Date();
    const obj: LogObject = {
      level: LogLevels['log'],
      type: 'log',
      date,
      ...defaults,
      ...input
    };
    if (this.shouldPrint(obj)) {
      for (const reporter of this.options.reporter) {
        reporter.print(obj, { options: this.options });
      }
    }
  }

  private resolveInput(input: InputLogItem, args: any[]) {
    if (typeof input === 'string') {
      return { message: input, args };
    } else if (typeof input === 'number') {
      return { message: String(input), args };
    } else {
      if ('level' in input) {
        delete input['level'];
      }
      if ('type' in input) {
        delete input['type'];
      }
      if (Array.isArray(input.args)) {
        input.args.push(...args);
      }
      return input;
    }
  }

  public log(input: InputLogItem, ...args: any[]) {
    const type = 'log';
    const level = LogLevels[type];
    const defaults: InputLogObject = { type, level };
    this.print(defaults, this.resolveInput(input, args));
  }

  public info(input: InputLogItem, ...args: any[]) {
    const type = 'info';
    const level = LogLevels[type];
    const defaults: InputLogObject = { type, level };
    this.print(defaults, this.resolveInput(input, args));
  }
}

export type LogFn = (message: string, ...args: any[]) => void;

export type BreadcLoggerInstance = BreadcLogger & {};
