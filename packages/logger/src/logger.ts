import type {
  InputLogItem,
  InputLogObject,
  LogObject,
  LoggerOptions
} from './types';

import { LogLevels } from './level';

export class BreadcLogger<T extends {}> {
  private _overrides: T = {} as T;

  readonly options: LoggerOptions;

  constructor(options: LoggerOptions) {
    this.options = options;
  }

  public get level() {
    return this.options.level;
  }

  public set level(level) {
    this.options.level = level;
  }

  public get reporter() {
    return this.options.reporter;
  }

  public extend<U extends {}>(overrides: U): BreadcLogger<T & U> & T & U {
    const that = this as unknown as BreadcLogger<T & U> & T;
    Object.assign(that._overrides, overrides);
    return Object.assign(that, overrides);
  }

  public withDefaults(defaults: InputLogObject): BreadcLogger<T> & T {
    const ins = new BreadcLogger<T>({
      ...this.options,
      defaults: {
        ...this.options.defaults,
        ...defaults
      }
    });
    ins._overrides = this._overrides;
    return Object.assign(ins, this._overrides);
  }

  public withTag(tag: string): BreadcLogger<T> & T {
    return this.withDefaults({
      tag: this.options.defaults.tag
        ? this.options.defaults.tag + ':' + tag
        : tag
    });
  }

  // --- Log ---
  private shouldPrint(obj: LogObject) {
    return obj.level <= this.level;
  }

  public print(defaults: InputLogObject, input: InputLogObject) {
    const date = new Date();
    const obj: LogObject = {
      level: LogLevels['log'],
      type: 'log',
      ...this.options.defaults,
      ...defaults,
      ...input,
      date
    };
    if (this.shouldPrint(obj)) {
      for (const reporter of this.options.reporter) {
        reporter.print(obj, { options: this.options });
      }
    }
  }

  public resolveInput(input: InputLogItem, args: any[]) {
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
}

export type LogFn = (message: InputLogItem, ...args: any[]) => void;
