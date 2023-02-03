import { Letter } from './utils';

export interface AppOption {
  version?: string;

  description?: string | string[];

  // help?: string | string[] | (() => string | string[]);

  // logger?: Partial<Logger> | LoggerFn;
}

export type ActionFn = (...args: any[]) => any;

export interface ParseResult {
  arguments: Array<string | string[] | undefined>;
  options: Record<string, string | boolean>;
  '--': string[];
}

export interface Breadc {
  option<
    F extends string = string,
    T extends string | boolean = ExtractOptionType<F>
  >(
    format: F,
    option?: OptionOption<T>
  ): Breadc;

  command(text: string, option?: { description?: string }): Command;

  parse(args: string[]): { command?: Command } & ParseResult;

  run<T = any>(args: string[]): Promise<T>;
}

export interface Command<F extends string = string> {
  callback?: ActionFn;

  description: string;

  _arguments: Argument[];

  _options: Option[];

  option<
    OF extends string = string,
    OT extends string | boolean = ExtractOptionType<F>
  >(
    format: OF,
    option?: OptionOption<OT>
  ): Command<F>;

  action(fn: ActionFn): void;
}

export interface Argument {
  type: 'const' | 'require' | 'optional' | 'rest';
  name: string;
}

export interface Option<
  F extends string = string,
  T extends string | boolean = ExtractOptionType<F>
> {
  format: F;
  name: string;
  short?: string;
  type: T extends string ? 'string' : T extends boolean ? 'boolean' : never;
  initial: T extends string ? string : T extends boolean ? boolean : never;
  description: string;
}

export interface OptionOption<T extends string | boolean> {
  default?: T;
  description?: string;
}

export type ExtractOptionType<T extends string> =
  T extends `-${Letter}, --${infer R} <${infer U}>`
    ? string
    : T extends `-${Letter}, --${infer R}`
    ? boolean
    : T extends `--${infer R} <${infer U}>`
    ? string
    : T extends `--${infer R}`
    ? boolean
    : string | boolean;
