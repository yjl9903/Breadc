import type { Context } from '../../runtime/context.ts';
import type { Prettify } from '../../utils/types.ts';

import type {
  OptionInit,
  CheckedOptionInit,
  GroupInit,
  CommandInit,
  ArgumentInit,
  CheckedArgumentInit
} from './init.ts';
import type {
  ActionMiddleware,
  ActionMiddlewareNextFn,
  InferMiddlewareData,
  UnknownCommandMiddleware,
  UnknownOptionMiddleware
} from './middleware.ts';
import type { ArgumentType } from './internal.ts';
import type { CommandDescription } from './description.ts';
import type { InferOption, InferOptionActionValue, InferArgumentType, InferArgumentsType } from './infer.ts';

/**
 * @public
 */
export type Breadc<Data extends {} = {}, Options extends Record<never, never> = {}> = {
  name: string;

  version: string | undefined;

  group<GS extends string, G extends Group<GS>>(group: G): G;
  group<GS extends string, GI extends GroupInit<GS>>(
    spec: GS,
    description?: CommandDescription,
    init?: GI
  ): Group<GS, GI, Data, Options>;

  /**
   * Add option
   *
   * @param spec
   * @param init
   */
  option<Opt extends Option<any, any>>(option: Opt): Breadc<Data, Options & InferOptionFromInstance<Opt>>;
  option<OS extends string, OI extends OptionInit<OS>>(
    spec: OS,
    description?: string,
    init?: CheckedOptionInit<OS, OI>
  ): Breadc<Data, Options & InferOption<OS, OI>>;

  command<S extends string, I extends CommandInit<S>>(
    spec: S,
    description?: CommandDescription,
    init?: I
  ): Command<S, I, Data, Options, InferArgumentsType<S>, unknown>;
  command<S extends string, I extends CommandInit<S>>(
    command: Command<S, I, Data, Options>
  ): Command<S, I, Data, Options, InferArgumentsType<S>, unknown>;

  /**
   * Action middleware
   */
  use<Middleware extends ActionMiddleware<Data, ActionMiddlewareNextFn>>(
    middleware: Middleware
  ): Breadc<InferMiddlewareData<Middleware>, Options>;

  /**
   * Unknown command middleware
   */
  onUnknownCommand(middleware?: UnknownCommandMiddleware<Data>): Breadc<Data, Options>;

  /**
   * Accept unknown options, which otherwise throw an InputError.
   * A custom middleware must return a match to accept an option.
   */
  allowUnknownOption(middleware?: UnknownOptionMiddleware<Data>): Breadc<Data, Options>;

  /**
   * Parse and convert CLI input without executing actions or middleware.
   *
   * @param argv CLI arguments
   */
  parse<PArgs extends any[] = any[], POpts extends Record<string, any> = {}>(
    argv: string[]
  ): {
    args: PArgs;
    options: Prettify<Options & POpts>;
    '--': string[];
    context: Context;
  };

  /**
   * Parse and run corresponding command actions
   *
   * @param argv CLI arguments
   */
  run<T>(argv: string[]): Promise<T>;
};

export type OptionActionInit = {
  /** Higher priorities run first; ties follow option registration order. Defaults to 0. */
  priority?: number;
};

export type Group<
  Spec extends string = string,
  Init extends GroupInit<Spec> = GroupInit<Spec>,
  Data extends {} = {},
  Options extends Record<never, never> = Record<never, never>
> = {
  spec: Spec;

  description?: CommandDescription;

  init: Init | undefined;

  /**
   * Add option
   *
   * @param spec
   * @param init
   */
  option<Opt extends Option<any, any>>(option: Opt): Group<Spec, Init, Data, Options & InferOptionFromInstance<Opt>>;
  option<OS extends string, OI extends OptionInit<OS>>(
    spec: OS,
    description?: string,
    init?: CheckedOptionInit<OS, OI>
  ): Group<Spec, Init, Data, Options & InferOption<OS, OI>>;

  command<S extends string, I extends CommandInit<S>>(
    spec: S,
    description?: CommandDescription,
    init?: I
  ): Command<S, I, Data, Options, InferArgumentsType<S>, unknown>;
  command<S extends string, I extends CommandInit<S>>(
    command: Command<S, I, Data, Options>
  ): Command<S, I, Data, Options, InferArgumentsType<S>, unknown>;

  /**
   * Action middleware
   */
  use<Middleware extends ActionMiddleware<Data>>(
    middleware: Middleware
  ): Group<Spec, Init, InferMiddlewareData<Middleware>, Options>;

  /**
   * Accept unknown options in this group, which otherwise throw an InputError.
   * A custom middleware must return a match to accept an option.
   */
  allowUnknownOption(middleware?: UnknownOptionMiddleware<Data>): Group<Spec, Init, Data, Options>;
};

export type Command<
  Spec extends string = string,
  Init extends CommandInit<Spec> = CommandInit<Spec>,
  Data extends {} = {},
  Options extends Record<never, never> = Record<never, never>,
  Arguments extends unknown[] = InferArgumentsType<Spec>,
  Return extends unknown = unknown
> = {
  spec: Spec;

  description?: CommandDescription;

  init: Init | undefined;

  /**
   * Alias command
   *
   * @param spec
   */
  alias(spec: string): Command<Spec, Init, Data, Options, Arguments, Return>;

  /**
   * Add option
   *
   * @param spec
   * @param init
   */
  option<Opt extends Option<any, any>>(
    option: Opt
  ): Command<Spec, Init, Data, Options & InferOptionFromInstance<Opt>, Arguments, Return>;
  option<OS extends string, OI extends OptionInit<OS>>(
    spec: OS,
    description?: string,
    init?: CheckedOptionInit<OS, OI>
  ): Command<Spec, Init, Data, Options & InferOption<OS, OI>, Arguments, Return>;

  /**
   * Add argument
   */
  argument<Arg extends Argument<any, any>>(
    argument: Arg
  ): Command<Spec, Init, Data, Options, [...Arguments, InferArgumentFromInstance<Arg>], Return>;
  argument<AS extends string, AI extends ArgumentInit<AS>>(
    spec: AS,
    description?: string,
    init?: CheckedArgumentInit<AS, AI>
  ): Command<Spec, Init, Data, Options, [...Arguments, InferArgumentType<AS, AI>], Return>;

  /**
   * Action middleware
   */
  use<Middleware extends ActionMiddleware<Data>>(
    middleware: Middleware
  ): Command<Spec, Init, InferMiddlewareData<Middleware>, Options, Arguments, Return>;

  /**
   * Accept unknown options in this command, which otherwise throw an InputError.
   * A custom middleware must return a match to accept an option.
   */
  allowUnknownOption(middleware?: UnknownOptionMiddleware<Data>): Command<Spec, Init, Data, Options, Arguments, Return>;

  /**
   * Bind action function
   */
  action<R extends unknown>(
    fn: (...args: [...Arguments, Prettify<Options & { '--': string[] }>, Context<Data>]) => Promise<R> | R
  ): Command<Spec, Init, Data, Options, Arguments, R>;

  /**
   * Run command directly
   */
  (...args: [...Arguments, Prettify<Options & { '--': string[] }>]): Promise<Return>;
};

export type Option<Spec extends string = string, Init extends OptionInit<Spec> = OptionInit<Spec>> = {
  spec: Spec;
  description?: string;
  init: Init;

  /** Runs for explicit input, before command middleware; only this option is converted. */
  action<R>(
    handler: (value: InferOptionActionValue<Spec, Init>, context: Context) => Promise<R> | R,
    init?: OptionActionInit
  ): Option<Spec, Init>;
};

type InferOptionFromInstance<Opt extends Option<any, any>> =
  Opt extends Option<infer OS, infer OI> ? InferOption<OS, OI> : never;

type InferArgumentFromInstance<Arg extends Argument<any, any>> =
  Arg extends Argument<infer AS, infer AI> ? InferArgumentType<AS, AI> : never;

export type Argument<Spec extends string = string, Init extends ArgumentInit<Spec> = ArgumentInit<Spec>> = {
  spec: Spec;

  description?: string;

  type: ArgumentType;

  name: string;

  init: Init;
};
