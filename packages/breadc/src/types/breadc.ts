import type {
  Token,
  Context,
  TreeNode,
  ParseResult,
  BreadcParseResult
} from '../parser';

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
  name: string;

  description: string;

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
    description?: string,
    option?: CommandOption
  ): Command<F, ExtractCommand<F>, {}, GlobalOption>;
  command<F extends string = string>(
    format: F,
    option?: CommandOption
  ): Command<F, ExtractCommand<F>, {}, GlobalOption>;

  parse(args: string[]): BreadcParseResult;

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

  _default: boolean;

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

  alias(format: string): Command<F, AT, CommandOption, GlobalOption>;

  action(fn: ActionFn<AT, CommandOption & GlobalOption>): void;
}

export interface CommandOption {
  description?: string;

  /**
   * Config how to handle unknown options
   */
  allowUnknownOption?: 'error' | 'skip' | 'rest';
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
  parse?: (
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
  onInit?(
    breadc: Breadc,
    allCommands: Command[],
    globalOptions: Option[]
  ): void;
  onPreRun?(breadc: Breadc): void | Promise<void>;
  onPreCommand?: Record<string, CommandHookFn> | CommandHookFn;
  onPostCommand?: Record<string, CommandHookFn> | CommandHookFn;
  onPostRun?(breadc: Breadc): void | Promise<void>;
}
