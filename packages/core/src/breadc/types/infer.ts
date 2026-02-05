import type { IsEqual, Letter } from '../../utils/types.ts';

import type { OptionInit, ArgumentInit, NonNullableArgumentInit } from './init.ts';

/**
 * Infer option raw name
 *
 * Examples:
 * + const t1: InferOptionRawName<'--option' | '--hello'> = 'hello'
 * + const t2: InferOptionRawName<'-r, --root'> = 'root'
 * + const t3: InferOptionRawName<'--page-index'> = 'page-index'
 */
export type InferOptionRawName<S extends string> = S extends `-${Letter}, --no-${infer R} <${string}>`
  ? R
  : S extends `-${Letter}, --no-${infer R} [${string}]`
    ? R
    : S extends `-${Letter}, --no-${infer R}`
      ? R
      : S extends `-${Letter}, --${infer R} <${string}>`
        ? R
        : S extends `-${Letter}, --${infer R} [${string}]`
          ? R
          : S extends `-${Letter}, --${infer R}`
            ? R
            : S extends `--no-${string} <${string}>`
              ? never
              : S extends `--no-${string} [${string}]`
                ? never
                : S extends `--no-${infer R}`
                  ? R
                  : S extends `--${infer R} <${string}>`
                    ? R
                    : S extends `--${infer R} [${string}]`
                      ? R
                      : S extends `--${infer R}`
                        ? R
                        : string;

/**
 * Infer camel case option name
 */
export type InferOptionName<T extends string> =
  InferOptionRawName<T> extends `${infer P1}-${infer P2}-${infer P3}`
    ? `${P1}${Capitalize<P2>}${Capitalize<P3>}`
    : InferOptionRawName<T> extends `${infer P1}-${infer P2}`
      ? `${P1}${Capitalize<P2>}`
      : InferOptionRawName<T>;

/**
 * Infer the raw option type: boolean or string or string[]
 */
export type InferOptionRawType<S extends string> = S extends `-${Letter}, --${string} <${string}>`
  ? undefined | string
  : S extends `-${Letter}, --${string} [...${string}]`
    ? string[]
    : S extends `-${Letter}, --${string} [${string}]`
      ? false | true | string
      : S extends `-${Letter}, --${string}`
        ? boolean
        : S extends `--${string} <${string}>`
          ? undefined | string
          : S extends `--${string} [...${string}]`
            ? string[]
            : S extends `--${string} [${string}]`
              ? false | true | string
              : S extends `--${string}`
                ? boolean
                : undefined | boolean | string | string[];

/**
 * Infer the raw option type: boolean or string or string[]
 */
export type InferOptionInitialType<S extends string> = S extends `-${Letter}, --${string} <${string}>`
  ? undefined | string
  : S extends `-${Letter}, --${string} [...${string}]`
    ? string[]
    : S extends `-${Letter}, --${string} [${string}]`
      ? string
      : S extends `-${Letter}, --${string}`
        ? boolean
        : S extends `--${string} <${string}>`
          ? undefined | string
          : S extends `--${string} [...${string}]`
            ? string[]
            : S extends `--${string} [${string}]`
              ? undefined | string
              : S extends `--${string}`
                ? boolean
                : boolean | string | string[];

export type NonTrueNullable<T> = IsEqual<T, false | true | string> extends true ? T & string & {} : T & {};

/**
 * Infer the option type with config
 */
export type InferOptionType<
  S extends string,
  I extends InferOptionInitialType<S>,
  C extends OptionInit<S, I>
> = C['default'] extends {}
  ? C['cast'] extends (...args: any[]) => infer R
    ? IsEqual<R, C['default']> extends true
      ? R
      : never
    :
        | C['default']
        | (C['initial'] extends {}
            ? C['initial'] | NonTrueNullable<InferOptionRawType<S>>
            : NonTrueNullable<InferOptionRawType<S>>)
  : C['cast'] extends (...args: any[]) => infer R
    ? R
    : C['initial'] extends {}
      ? C['initial'] | NonTrueNullable<InferOptionRawType<S>>
      : InferOptionRawType<S>;

/**
 * Infer option information
 */
export type InferOption<S extends string, I extends InferOptionInitialType<S>, C extends OptionInit<S, I, unknown>> = {
  [k in InferOptionName<S>]: InferOptionType<S, I, C>;
};

/**
 * Infer the raw argument type: required or optional or spread
 */
export type InferArgumentRawType<S extends string> = S extends `<${string}>`
  ? string
  : S extends `[...${string}]`
    ? string[]
    : S extends `[${string}]`
      ? undefined | string
      : undefined | string | string[];

/**
 * Infer the argument type with config
 */
export type InferArgumentType<
  S extends string,
  I extends InferArgumentRawType<S>,
  C extends ArgumentInit<S, I, unknown> | NonNullableArgumentInit<S, NonNullable<I>, unknown>
> = C['default'] extends {}
  ? C['cast'] extends (...args: any[]) => infer R
    ? IsEqual<R, C['default']> extends true
      ? R
      : never
    :
        | C['default']
        | (C['initial'] extends {}
            ? C['initial'] | NonNullable<InferArgumentRawType<S>>
            : NonNullable<InferArgumentRawType<S>>)
  : C['cast'] extends (...args: any[]) => infer R
    ? R
    : C['initial'] extends {}
      ? C['initial'] | NonNullable<InferArgumentRawType<S>>
      : InferArgumentRawType<S>;

/**
 * Infer the arguments type
 */
export type InferArgumentsType<S extends string> = S extends `<${string}> ${infer U}`
  ? [string, ...InferArgumentsType1<U>]
  : S extends `[...${string}] ${string}`
    ? never
    : S extends `[${string}] ${infer U}`
      ? [undefined | string, ...InferArgumentsType2<U>]
      : S extends `${string} ${infer U}`
        ? InferArgumentsType<U>
        : S extends `<${string}>`
          ? [string]
          : S extends `[...${string}]`
            ? [string[]]
            : S extends `[${string}]`
              ? [undefined | string]
              : [];

type InferArgumentsType1<S extends string> = S extends `<${string}> ${infer U}`
  ? [string, ...InferArgumentsType<U>]
  : S extends `[...${string}] ${string}`
    ? never
    : S extends `[${string}] ${infer U}`
      ? [undefined | string, ...InferArgumentsType2<U>]
      : S extends `${string} ${string}`
        ? never
        : S extends `<${string}>`
          ? [string]
          : S extends `[...${string}]`
            ? [string[]]
            : S extends `[${string}]`
              ? [undefined | string]
              : S extends `${string}`
                ? never
                : [];

type InferArgumentsType2<S extends string> = S extends `<${string}> ${string}`
  ? never
  : S extends `[...${string}] ${string}`
    ? never
    : S extends `[${string}] ${infer U}`
      ? [undefined | string, ...InferArgumentsType2<U>]
      : S extends `${string} ${string}`
        ? never
        : S extends `<${string}>`
          ? never
          : S extends `[...${string}]`
            ? [string[]]
            : S extends `[${string}]`
              ? [undefined | string]
              : S extends `${string}`
                ? never
                : [];
