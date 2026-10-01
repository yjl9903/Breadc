import type { IsEqual, Letter } from '../../utils/types.ts';

import type { OptionInit, ArgumentInit, NonNullableArgumentInit } from './init.ts';

type LongOptionSpec<S extends string> = S extends `-${Letter}, ${infer R}` ? R : S;

type BooleanValueSpec = `--${'no-' | '[no-]'}${string} ${`<${string}>` | `[${string}]`}`;

type InferLongOptionRawName<S extends string> = S extends BooleanValueSpec
  ? never
  : S extends `--[no-]${infer R}`
    ? R
    : S extends `--no-${infer R}`
      ? R
      : S extends `--${infer R} <${string}>` | `--${infer R} [${string}]`
        ? R
        : S extends `--${infer R}`
          ? R
          : string;

/**
 * Infer the canonical option name, excluding the short alias and negation form.
 *
 * Examples:
 * + InferOptionRawName<'--option' | '--hello'> = 'option' | 'hello'
 * + InferOptionRawName<'-r, --root'> = 'root'
 * + InferOptionRawName<'--[no-]allow-page'> = 'allow-page'
 */
export type InferOptionRawName<S extends string> = InferLongOptionRawName<LongOptionSpec<S>>;

/**
 * Infer camel case option name
 */
export type InferOptionName<T extends string> =
  InferOptionRawName<T> extends `${infer P1}-${infer P2}-${infer P3}`
    ? `${P1}${Capitalize<P2>}${Capitalize<P3>}`
    : InferOptionRawName<T> extends `${infer P1}-${infer P2}`
      ? `${P1}${Capitalize<P2>}`
      : InferOptionRawName<T>;

/** Raw option output before conversion. */
export type InferOptionRawType<S extends string> = InferLongOptionRawType<LongOptionSpec<S>>;

type InferLongOptionRawType<S extends string> = S extends BooleanValueSpec
  ? never
  : S extends `--${string} [...${string}]`
    ? string[]
    : S extends `--${string} <${string}>` | `--${string} [${string}]`
      ? string | undefined
      : S extends `--${string}`
        ? boolean
        : boolean | string | string[] | undefined;

/** Defaults are raw inputs constrained by the option declaration. */
export type InferOptionDefaultType<S extends string> = Exclude<InferOptionRawType<S>, undefined>;

/** Required values are checked before cast; optional values may be bare. */
export type InferOptionCastInput<S extends string> =
  LongOptionSpec<S> extends `--${string} <${string}>`
    ? Exclude<InferOptionRawType<S>, undefined>
    : InferOptionRawType<S>;

/** Preserve the converter's complete result, including null and undefined. */
export type InferOptionType<S extends string, C extends OptionInit<S>> = C extends { cast: (...args: any[]) => infer R }
  ? undefined extends InferOptionRawType<S>
    ? C extends { default: InferOptionDefaultType<S> }
      ? R
      : R | undefined
    : R
  : LongOptionSpec<S> extends `--${string} <${string}>`
    ? C extends { default: InferOptionDefaultType<S> }
      ? string
      : string | undefined
    : InferOptionRawType<S>;

export type InferOption<S extends string, C extends OptionInit<S>> = {
  [K in InferOptionName<S>]: InferOptionType<S, C>;
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
    : | C['default']
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
