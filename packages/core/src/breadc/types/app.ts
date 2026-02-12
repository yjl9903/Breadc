import type { Context } from '../../runtime/context.ts';
import type { Prettify } from '../../utils/types.ts';

import type {
  OptionInit,
  NonNullableOptionInit,
  GroupInit,
  CommandInit,
  ArgumentInit,
  NonNullableArgumentInit
} from './init.ts';
import type {
  NonTrueNullable,
  InferOption,
  InferOptionInitialType,
  InferArgumentType,
  InferArgumentsType,
  InferArgumentRawType
} from './infer.ts';
import type {
  ActionMiddleware,
  ActionMiddlewareNextFn,
  InferMiddlewareData,
  UnknownCommandMiddleware,
  UnknownOptionMiddleware
} from './middleware.ts';
import type { ArgumentType } from './internal.ts';

/**
 * @public
 */
export type Breadc<Data extends {} = {}, Options extends Record<never, never> = {}> = {
  name: string;

  version: string | undefined;

  group<GS extends string, G extends Group<GS>>(group: G): G;
  group<GS extends string, GI extends GroupInit<GS>>(
    spec: GS,
    description?: string,
    init?: GI
  ): Group<GS, GI, Data, Options>;

  /**
   * Add option
   *
   * @param spec
   * @param init
   */
  option<Opt extends Option<any, any, any>>(option: Opt): Breadc<Data, Options & InferOptionFromInstance<Opt>>;
  option<
    OS extends string,
    Initial extends NonTrueNullable<InferOptionInitialType<OS>>,
    OI extends NonNullableOptionInit<OS, Initial>
  >(
    spec: OS,
    description: string,
    init: OI
  ): Breadc<Data, Options & InferOption<OS, Initial, OI>>;
  option<OS extends string, Initial extends InferOptionInitialType<OS>, OI extends OptionInit<OS, Initial>>(
    spec: OS,
    description?: string,
    init?: OI
  ): Breadc<Data, Options & InferOption<OS, Initial, OI>>;

  command<S extends string, I extends CommandInit<S>>(
    spec: S,
    description?: string,
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
   * Allow unknown option middleware
   */
  allowUnknownOption(middleware?: UnknownOptionMiddleware<Data>): Breadc<Data, Options>;

  /**
   * Parse CLI options
   *
   * @param argv CLI arguments
   */
  parse<PArgs extends any[] = any[], POpts extends Record<string, any> = {}>(
    argv: string[]
  ): {
    args: PArgs;
    options: Prettify<Options & POpts>;
    '--': string[];
    context: Context<Data>;
  };

  /**
   * Parse and run corresponding command actions
   *
   * @param argv CLI arguments
   */
  run<T>(argv: string[]): Promise<T>;
};

export type Group<
  Spec extends string = string,
  Init extends GroupInit<Spec> = GroupInit<Spec>,
  Data extends {} = {},
  Options extends Record<never, never> = Record<never, never>
> = {
  spec: Spec;

  init: Init | undefined;

  /**
   * Add option
   *
   * @param spec
   * @param init
   */
  option<Opt extends Option<any, any, any>>(
    option: Opt
  ): Group<Spec, Init, Data, Options & InferOptionFromInstance<Opt>>;
  option<
    OS extends string,
    Initial extends NonTrueNullable<InferOptionInitialType<OS>>,
    OI extends NonNullableOptionInit<OS, Initial>
  >(
    spec: OS,
    description: string,
    init: OI
  ): Group<Spec, Init, Data, Options & InferOption<OS, Initial, OI>>;
  option<OS extends string, Initial extends InferOptionInitialType<OS>, OI extends OptionInit<OS, Initial>>(
    spec: OS,
    description?: string,
    init?: OI
  ): Group<Spec, Init, Data, Options & InferOption<OS, Initial, OI>>;

  command<S extends string, I extends CommandInit<S>>(
    spec: S,
    description?: string,
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
   * Allow unknown options middleware
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
  option<Opt extends Option<any, any, any>>(
    option: Opt
  ): Command<Spec, Init, Data, Options & InferOptionFromInstance<Opt>, Arguments, Return>;
  option<
    OS extends string,
    Initial extends NonTrueNullable<InferOptionInitialType<OS>>,
    OI extends NonNullableOptionInit<OS, Initial>
  >(
    spec: OS,
    description: string,
    init: OI
  ): Command<Spec, Init, Data, Options & InferOption<OS, Initial, OI>, Arguments, Return>;
  option<OS extends string, Initial extends InferOptionInitialType<OS>, OI extends OptionInit<OS, Initial>>(
    spec: OS,
    description?: string,
    init?: OI
  ): Command<Spec, Init, Data, Options & InferOption<OS, Initial, OI>, Arguments, Return>;

  /**
   * Add argument
   */
  argument<
    AS extends string,
    Initial extends InferArgumentRawType<AS>,
    Cast extends unknown,
    AI extends ArgumentInit<AS, Initial, Cast>
  >(
    argument: Argument<AS, Initial, Cast, AI>
  ): Command<Spec, Init, Data, Options, [...Arguments, InferArgumentType<AS, Initial, AI>], Return>;
  argument<
    AS extends string,
    Initial extends NonNullable<InferArgumentRawType<AS>>,
    Cast extends unknown,
    AI extends NonNullableArgumentInit<AS, Initial, Cast>
  >(
    spec: AS,
    init: AI
  ): Command<Spec, Init, Data, Options, [...Arguments, InferArgumentType<AS, Initial, AI>], Return>;
  argument<
    AS extends string,
    Initial extends InferArgumentRawType<AS>,
    Cast extends unknown,
    AI extends ArgumentInit<AS, Initial, Cast>
  >(
    spec: AS,
    init?: AI
  ): Command<Spec, Init, Data, Options, [...Arguments, InferArgumentType<AS, Initial, AI>], Return>;

  /**
   * Action middleware
   */
  use<Middleware extends ActionMiddleware<Data>>(
    middleware: Middleware
  ): Command<Spec, Init, InferMiddlewareData<Middleware>, Options, Arguments, Return>;

  /**
   * Allow unknown options middleware
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

export type Option<
  Spec extends string = string,
  Initial extends InferOptionInitialType<Spec> = InferOptionInitialType<Spec>,
  Init extends OptionInit<Spec, Initial> = OptionInit<Spec, Initial>
> = {
  spec: Spec;

  init: Init;
};

type InferOptionFromInstance<Opt extends Option<any, any, any>> =
  Opt extends Option<infer OS, infer Initial, infer OI> ? InferOption<OS, Initial, OI & {}> : never;

export type Argument<
  Spec extends string = string,
  Initial extends InferArgumentRawType<Spec> = InferArgumentRawType<Spec>,
  Cast extends unknown = unknown,
  Init extends ArgumentInit<Spec, Initial, Cast> = ArgumentInit<Spec, Initial, Cast>
> = {
  spec: Spec;

  type: ArgumentType;

  name: string;

  init: Init | undefined;
};
