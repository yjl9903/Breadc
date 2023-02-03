import type { ParseResult, TreeNode, Context, Token } from '../parser';

import type { Letter } from './utils';

export interface AppOption {
  version?: string;

  description?: string;

  // help?: string | string[] | (() => string | string[]);

  // logger?: Partial<Logger> | LoggerFn;
}

export type ActionFn = (...args: any[]) => any;

export interface Breadc {
  option<
    F extends string = string,
    T extends string | boolean = ExtractOptionType<F>
  >(
    format: F,
    option?: OptionOption<T>
  ): Breadc;

  command(format: string, description?: string): Command;
  command(format: string, option?: CommandOption): Command;

  parse(args: string[]): { command?: Command } & ParseResult;

  run<T = any>(args: string[]): Promise<T>;
}

export interface Command<F extends string = string> {
  callback?: ActionFn;

  format: F;

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

export interface CommandOption {
  description?: string;
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
  // Set initial option value, undefined means not init this option
  initial?: T extends string ? string : T extends boolean ? boolean : never;
  description: string;

  order: number;

  // Replace the default option parser behavior
  action?: (
    cursor: TreeNode,
    token: Token,
    context: Context
  ) => TreeNode | false;
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
