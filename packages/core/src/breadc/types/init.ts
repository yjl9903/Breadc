import type { NonTrueNullable, InferOptionRawType, InferOptionInitialType, InferArgumentRawType } from './infer.ts';

export type BreadcInit = {
  /**
   * CLI app version
   */
  version?: string;

  /**
   * CLI app description
   */
  description?: string;

  /**
   * I18n language or custom i18n function
   *
   * @default 'en'
   */
  i18n?: 'en' | 'zh';

  /**
   * Logger
   */
  // logger?: LoggerInit;

  /**
   * Builtin command configuration
   */
  builtin?: {
    version?:
      | boolean
      | {
          /**
           * @default '-v, --version'
           */
          spec?: string;

          /**
           *
           */
          description?: string;
        };

    help?:
      | boolean
      | {
          /**
           * @default '-h, --help'
           */
          spec?: string;

          /**
           *
           */
          description?: string;
        };
  };
};

export type OptionInit<
  Spec extends string,
  Initial extends InferOptionInitialType<Spec>,
  Cast extends unknown = unknown
> = {
  /**
   * Option description
   */
  description?: string;

  /**
   * Generate negated option
   */
  negated?: boolean;

  /**
   * Overwrite the initial value of the corresponding matched option.
   * - &lt;required&gt;: undefined
   * - \[optional\]: false
   * - \[...remaining\]: \[\]
   */
  initial?: Initial;

  /**
   * Cast initial value to the result
   */
  cast?: (value: Initial extends {} ? Initial : InferOptionRawType<Spec>) => Cast;

  /**
   * Default option value if it is not provided
   */
  default?: Cast;
};

export type NonNullableOptionInit<
  Spec extends string,
  Initial extends NonTrueNullable<InferOptionInitialType<Spec>>,
  Cast extends unknown = unknown
> = {
  /**
   * Option description
   */
  description?: string;

  /**
   * Generate corresponding negated option
   *
   * @default false
   */
  negated?: InferOptionRawType<Spec> extends boolean ? boolean : never;

  /**
   * Overwrite the initial value of the corresponding matched option.
   * - `--option`: `false`
   * - `--option [optional]`: `false`
   * - `--option <required>`: `undefined`
   * - `--option [...spread]`: `[]`
   */
  initial: Initial;

  /**
   * Cast initial value to the result
   */
  cast?: (value: Initial extends {} ? Initial : InferOptionRawType<Spec>) => Cast;

  /**
   * Default option value when its value or initial value is not provided
   */
  default?: Cast;
};

export type GroupInit<Spec extends string> = {};

export type CommandInit<Spec extends string> = {};

export type ArgumentInit<
  Spec extends string,
  Initial extends InferArgumentRawType<Spec>,
  Cast extends unknown = unknown
> = {
  /**
   * Overwrite the initial value of the corresponding matched option.
   * - &lt;required&gt; : undefined
   * - \[optional\] : undefined
   * - \[...remaining\] : \[\]
   */
  initial?: Initial;

  /**
   * Cast initial value to the result
   */
  cast?: (value: Initial extends {} ? Initial : InferArgumentRawType<Spec>) => Cast;

  /**
   * Default argument value if it is not provided
   */
  default?: Cast;
};

export type NonNullableArgumentInit<
  Spec extends string,
  Initial extends NonNullable<InferArgumentRawType<Spec>>,
  Cast extends unknown = unknown
> = {
  /**
   * Overwrite the initial value of the corresponding matched option.
   * - &lt;required&gt; : undefined
   * - \[optional\] : undefined
   * - \[...remaining\] : \[\]
   */
  initial: Initial;

  /**
   * Cast initial value to the result
   */
  cast?: (value: Initial extends {} ? Initial : InferArgumentRawType<Spec>) => Cast;

  /**
   * Default argument value if it is not provided
   */
  default?: Cast;
};
