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

  plugins?: Partial<Plugin>[];

  // logger?: Partial<Logger> | LoggerFn;
}

export interface Breadc<GlobalOption extends object = {}> {
  option<
    F extends string = string,
    T extends string | boolean = ExtractOptionType<F>,
    R extends any = ExtractOptionType<F>
  >(
    format: F,
    description?: string,
    option?: OptionOption<T, R>
  ): Breadc<GlobalOption & ExtractOption<F, R>>;
  option<
    F extends string = string,
    T extends string | boolean = ExtractOptionType<F>,
    R extends any = ExtractOptionType<F>
  >(
    format: F,
    option?: OptionOption<T, R>
  ): Breadc<GlobalOption & ExtractOption<F, R>>;

  command<F extends string = string>(
    format: F,
    description?: string
  ): Command<F, ExtractCommand<F>, {}, GlobalOption>;
  command<F extends string = string>(
    format: F,
    option?: CommandOption
  ): Command<F, ExtractCommand<F>, {}, GlobalOption>;

  parse(args: string[]): { command?: Command } & ParseResult;

  run<T = any>(args: string[]): Promise<T>;
}

export interface Command<
  F extends string = string,
  AT extends any[] = ExtractCommand<F>,
  CommandOption extends object = {},
  GlobalOption extends object = {}
> {
  callback?: (result: ParseResult) => Promise<any>;

  format: F;

  description: string;

  _arguments: Argument[];

  _options: Option[];

  option<
    OF extends string = string,
    OT extends string | boolean = ExtractOptionType<OF>,
    OR extends any = ExtractOptionType<OF>
  >(
    format: OF,
    description?: string,
    option?: OptionOption<OT, OR>
  ): Command<F, AT, CommandOption & ExtractOption<OF, OR>, GlobalOption>;
  option<
    OF extends string = string,
    OT extends string | boolean = ExtractOptionType<OF>,
    OR extends any = ExtractOptionType<OF>
  >(
    format: OF,
    option?: OptionOption<OT, OR>
  ): Command<F, AT, CommandOption & ExtractOption<OF, OR>, GlobalOption>;

  action(fn: ActionFn<AT, CommandOption & GlobalOption>): void;
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
  T extends string | boolean = ExtractOptionType<F>,
  R extends any = T extends string
    ? string
    : T extends boolean
    ? boolean
    : never
> {
  format: F;
  type: T extends string ? 'string' : T extends boolean ? 'boolean' : never;

  name: string;
  short?: string;
  description: string;
  // order in help message
  order: number;

  // Set initial option value, undefined means not init this option
  initial?: R;
  cast?: (
    value: T extends string ? string : T extends boolean ? boolean : never
  ) => R;

  // Replace the default option parser behavior
  action?: (
    cursor: TreeNode,
    token: Token,
    context: Context
  ) => TreeNode | false;
}

export interface OptionOption<T extends string | boolean, R extends any = T> {
  description?: string;
  default?: T;
  cast?: (value: T) => R;
}

type CommandHookFn = (result: ParseResult) => void | Promise<void>;

export interface Plugin {
  onPreRun(breadc: Breadc): void | Promise<void>;
  onPreCommand: Record<string, CommandHookFn> | CommandHookFn;
  onPostCommand: Record<string, CommandHookFn> | CommandHookFn;
  onPostRun(breadc: Breadc): void | Promise<void>;
}
