import type { ParseResult, TreeNode, Context, Token } from '../parser';

import type {
  ActionFn,
  ExtractCommand,
  ExtractOption,
  ExtractOptionType
} from './extract';

export interface AppOption {
  version?: string;

  description?: string;

  // help?: string | string[] | (() => string | string[]);

  // logger?: Partial<Logger> | LoggerFn;
}

export interface Breadc<GlobalOption extends object = {}> {
  option<
    F extends string = string,
    T extends string | boolean = ExtractOptionType<F>
  >(
    format: F,
    description?: string,
    option?: OptionOption<T>
  ): Breadc<GlobalOption & ExtractOption<F>>;
  option<
    F extends string = string,
    T extends string | boolean = ExtractOptionType<F>
  >(
    format: F,
    option?: OptionOption<T>
  ): Breadc<GlobalOption & ExtractOption<F>>;

  command<F extends string = string>(
    format: F,
    description?: string
  ): Command<F, {}, GlobalOption>;
  command<F extends string = string>(
    format: F,
    option?: CommandOption
  ): Command<F, {}, GlobalOption>;

  parse(args: string[]): { command?: Command } & ParseResult;

  run<T = any>(args: string[]): Promise<T>;
}

export interface Command<
  F extends string = string,
  CommandOption extends object = {},
  GlobalOption extends object = {}
> {
  callback?: ActionFn<ExtractCommand<F>, CommandOption & GlobalOption>;

  format: F;

  description: string;

  _arguments: Argument[];

  _options: Option[];

  option<
    OF extends string = string,
    OT extends string | boolean = ExtractOptionType<F>
  >(
    format: OF,
    description?: string,
    option?: OptionOption<OT>
  ): Command<F, CommandOption & ExtractOption<OF>, GlobalOption>;
  option<
    OF extends string = string,
    OT extends string | boolean = ExtractOptionType<F>
  >(
    format: OF,
    option?: OptionOption<OT>
  ): Command<F, CommandOption & ExtractOption<OF>, GlobalOption>;

  action(fn: ActionFn<ExtractCommand<F>, CommandOption & GlobalOption>): void;
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
