import type { InferOptionCastInput, InferOptionDefaultType, InferArgumentRawType } from './infer.ts';

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

export type OptionInit<Spec extends string, Cast = unknown> = {
  /** Raw input used only when the option is absent. It also passes through cast. */
  default?: InferOptionDefaultType<Spec>;

  /** Convert and validate the selected input once per parse. */
  cast?: (value: InferOptionCastInput<Spec>) => Cast;
};

/** Reject configuration keys outside the option API. */
export type CheckedOptionInit<Spec extends string, Init extends OptionInit<Spec>> = Init &
  Record<Exclude<keyof Init, keyof OptionInit<Spec>>, never>;

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
