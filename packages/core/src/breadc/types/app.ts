import type { Context } from '../../parser/context.ts';
import type { Prettify } from '../../utils/types.ts';

import type {
  GroupInit,
  OptionInit,
  CommandInit,
  ArgumentInit,
  NonNullableArgumentInit
} from './init.ts';
import type {
  InferOption,
  InferArgumentType,
  InferArgumentsType,
  InferArgumentRawType
} from './infer.ts';

/**
 * @public
 */
export type Breadc<
  Data extends Record<never, never> = {},
  Options extends Record<never, never> = {}
> = {
  name: string;

  version: string | undefined;

  group<GS extends string, GI extends GroupInit<GS>>(
    spec: GS,
    description?: string,
    init?: GI
  ): Group<GS, GI, Data, Options>;
  group<GS extends string, G extends Group<GS>>(group: G): G;

  option<S extends string, I extends OptionInit<S>>(
    spec: S,
    description?: string,
    init?: OptionInit<S>
  ): Breadc<Data, Options & InferOption<S, I>>;
  option<S extends string, O extends Option<S>>(
    option: O
  ): Breadc<Data, Options & InferOption<S, O['init'] & {}>>;

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
  use<MR extends Record<never, never>>(
    middleware: ActionMiddleware<Data, MR>
  ): Breadc<MR, Options>;

  /**
   * Allow unknown options middleware
   */
  allowUnknownOptions(
    middleware?: boolean | UnknownOptionMiddleware<Data>
  ): Breadc<Data, Options>;

  /**
   *
   * @param args
   */
  parse(args: string[]): Context<Data>;

  /**
   *
   * @param args
   */
  run<T>(args: string[]): Promise<T>;
};

export type Group<
  Spec extends string = string,
  Init extends GroupInit<Spec> = GroupInit<Spec>,
  Data extends Record<never, never> = {},
  Options extends Record<never, never> = Record<never, never>
> = {
  spec: Spec;

  init: Init | undefined;

  option<S extends string, I extends OptionInit<S>>(
    spec: S,
    init?: OptionInit<S>
  ): Group<Spec, Init, Data, Options & InferOption<S, I>>;
  option<S extends string, O extends Option<S>>(
    option: O
  ): Group<Spec, Init, Data, Options & InferOption<S, O['init'] & {}>>;

  command<S extends string, I extends CommandInit<S>>(
    spec: S,
    description?: string,
    init?: I
  ): Command<S, I, Data, Options, InferArgumentsType<S>, unknown>;
  command<S extends string, I extends CommandInit<S>>(
    command: Command<S, I, Options>
  ): Command<S, I, Data, Options, InferArgumentsType<S>, unknown>;

  /**
   * Action middleware
   */
  use<MR extends Record<never, never>>(
    middleware: ActionMiddleware<Data, MR>
  ): Group<Spec, Init, MR, Options>;

  /**
   * Allow unknown options middleware
   */
  allowUnknownOptions(
    middleware?: boolean | UnknownOptionMiddleware<Data>
  ): Group<Spec, Init, Data, Options>;
};

export type Command<
  Spec extends string = string,
  Init extends CommandInit<Spec> = CommandInit<Spec>,
  Data extends Record<never, never> = {},
  Options extends Record<never, never> = {},
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
  option<OS extends string, OI extends OptionInit<OS>>(
    spec: OS,
    init?: OI
  ): Command<
    Spec,
    Init,
    Data,
    Options & InferOption<OS, OI>,
    Arguments,
    Return
  >;
  option<OS extends string, Opt extends Option<OS>>(
    option: Opt
  ): Command<
    Spec,
    Init,
    Data,
    Options & InferOption<OS, Opt['init'] & {}>,
    Arguments,
    Return
  >;

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
  ): Command<
    Spec,
    Init,
    Data,
    Options,
    [...Arguments, InferArgumentType<AS, Initial, AI>],
    Return
  >;
  argument<
    AS extends string,
    Initial extends NonNullable<InferArgumentRawType<AS>>,
    Cast extends unknown,
    AI extends NonNullableArgumentInit<AS, Initial, Cast>
  >(
    spec: AS,
    init: AI
  ): Command<
    Spec,
    Init,
    Data,
    Options,
    [...Arguments, InferArgumentType<AS, Initial, AI>],
    Return
  >;
  argument<
    AS extends string,
    Initial extends InferArgumentRawType<AS>,
    Cast extends unknown,
    AI extends ArgumentInit<AS, Initial, Cast>
  >(
    spec: AS,
    init?: AI
  ): Command<
    Spec,
    Init,
    Data,
    Options,
    [...Arguments, InferArgumentType<AS, Initial, AI>],
    Return
  >;

  /**
   * Action middleware
   */
  use<MR extends Record<never, never>>(
    middleware: ActionMiddleware<Data, MR>
  ): Command<Spec, Init, MR, Options, Arguments, Return>;

  /**
   * Allow unknown options middleware
   */
  allowUnknownOptions(
    middleware?: boolean | UnknownOptionMiddleware<Data>
  ): Command<Spec, Init, Data, Options, Arguments, Return>;

  /**
   * Bind action function
   */
  action<R extends unknown>(
    fn: (
      ...args: [...Arguments, Prettify<Options & { '--': string[] }>]
    ) => Promise<R> | R
  ): Command<Spec, Init, Data, Options, Arguments, R>;

  /**
   * Run command directly
   */
  (
    ...args: [...Arguments, Prettify<Options & { '--': string[] }>]
  ): Promise<Return>;
};

export type Option<
  Spec extends string = string,
  Init extends OptionInit<Spec> = OptionInit<Spec>
> = {
  spec: Spec;

  init: Init | undefined;
};

export type Argument<
  Spec extends string = string,
  Initial extends InferArgumentRawType<Spec> = InferArgumentRawType<Spec>,
  Cast extends unknown = unknown,
  Init extends ArgumentInit<Spec, Initial, Cast> = ArgumentInit<
    Spec,
    Initial,
    Cast
  >
> = {
  spec: Spec;

  init: Init | undefined;
};

/**
 * Unknown option middleware
 *
 * @public
 */
export type UnknownOptionMiddleware<Data extends Record<never, never>> = (
  context: Context<Data>
) => boolean | void | undefined | null;

/**
 * Command action middleware
 *
 * @public
 */
export type ActionMiddleware<Data extends Record<never, never>, Return> = (
  context: Context<Data>
) => Promise<Return> | Return;
