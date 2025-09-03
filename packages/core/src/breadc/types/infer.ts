import type { Letter } from '../../utils/types.ts';

import type { ArgumentInit, OptionInit } from './init.ts';

/**
 * Infer the raw option type: boolean or string or string[]
 */
export type InferOptionRawType<F extends string> =
  F extends `-${Letter}, --${string} <${string}>`
    ? undefined | string
    : F extends `-${Letter}, --${string} [...${string}]`
      ? string[]
      : F extends `-${Letter}, --${string} [${string}]`
        ? boolean | string
        : F extends `-${Letter}, --${string}`
          ? boolean
          : F extends `--${string} <${string}>`
            ? undefined | string
            : F extends `--${string} [...${string}]`
              ? string[]
              : F extends `--${string} [${string}]`
                ? boolean | string
                : F extends `--${string}`
                  ? boolean
                  : boolean | string | string[];

/**
 * Infer the option type with config
 */
export type InferOptionType<
  F extends string,
  C extends OptionInit<F>
> = C['default'] extends {}
  ? C['cast'] extends () => infer R
    ? R
    : C['default'] | NonNullable<InferOptionRawType<F>>
  : C['cast'] extends () => infer R
    ? R
    : InferOptionRawType<F>;

/**
 * Infer option raw name
 *
 * Examples:
 * + const t1: InferOptionRawName<'--option' | '--hello'> = 'hello'
 * + const t2: InferOptionRawName<'-r, --root'> = 'root'
 * + const t3: InferOptionRawName<'--page-index'> = 'page-index'
 */
export type InferOptionRawName<F extends string> =
  F extends `-${Letter}, --no-${infer R} <${string}>`
    ? R
    : F extends `-${Letter}, --no-${infer R} [${string}]`
      ? R
      : F extends `-${Letter}, --no-${infer R}`
        ? R
        : F extends `-${Letter}, --${infer R} <${string}>`
          ? R
          : F extends `-${Letter}, --${infer R} [${string}]`
            ? R
            : F extends `-${Letter}, --${infer R}`
              ? R
              : F extends `--no-${string} <${string}>`
                ? never
                : F extends `--no-${string} [${string}]`
                  ? never
                  : F extends `--no-${infer R}`
                    ? R
                    : F extends `--${infer R} <${string}>`
                      ? R
                      : F extends `--${infer R} [${string}]`
                        ? R
                        : F extends `--${infer R}`
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
 * Infer option information
 */
export type InferOption<S extends string, C extends OptionInit<S>> = {
  [k in InferOptionName<S>]: InferOptionType<S, C>;
};

/**
 * Infer the raw argument type: required or optional or spread
 */
export type InferArgumentRawType<F extends string> = F extends `<${string}>`
  ? string
  : F extends `[...${string}]`
    ? string[]
    : F extends `[${string}]`
      ? undefined | string
      : undefined | string | string[];

/**
 * Infer the argument type with config
 */
export type InferArgumentType<
  F extends string,
  I extends unknown,
  C extends ArgumentInit<F, I>
> = C['default'] extends {}
  ? C['cast'] extends (...args: any[]) => infer R
    ? R
    : C['default'] | NonNullable<InferArgumentRawType<F>>
  : C['cast'] extends (...args: any[]) => infer R
    ? R
    : InferArgumentRawType<F>;

/**
 * Infer the arguments type
 */
export type InferArgumentsType<F extends string> =
  F extends `<${string}> ${infer U}`
    ? [string, ...InferArgumentsType1<U>]
    : F extends `[...${string}] ${string}`
      ? never
      : F extends `[${string}] ${infer U}`
        ? [undefined | string, ...InferArgumentsType2<U>]
        : F extends `${string} ${infer U}`
          ? InferArgumentsType<U>
          : F extends `<${string}>`
            ? [string]
            : F extends `[...${string}]`
              ? [string[]]
              : F extends `[${string}]`
                ? [undefined | string]
                : [];

type InferArgumentsType1<F extends string> = F extends `<${string}> ${infer U}`
  ? [string, ...InferArgumentsType<U>]
  : F extends `[...${string}] ${string}`
    ? never
    : F extends `[${string}] ${infer U}`
      ? [undefined | string, ...InferArgumentsType2<U>]
      : F extends `${string} ${string}`
        ? never
        : F extends `<${string}>`
          ? [string]
          : F extends `[...${string}]`
            ? [string[]]
            : F extends `[${string}]`
              ? [undefined | string]
              : F extends `${string}`
                ? never
                : [];

type InferArgumentsType2<F extends string> = F extends `<${string}> ${string}`
  ? never
  : F extends `[...${string}] ${string}`
    ? never
    : F extends `[${string}] ${infer U}`
      ? [undefined | string, ...InferArgumentsType2<U>]
      : F extends `${string} ${string}`
        ? never
        : F extends `<${string}>`
          ? never
          : F extends `[...${string}]`
            ? [string[]]
            : F extends `[${string}]`
              ? [undefined | string]
              : F extends `${string}`
                ? never
                : [];
