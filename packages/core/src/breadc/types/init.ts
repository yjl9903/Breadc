import type { InferArgumentRawType, InferOptionRawType } from './infer.ts';

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
  // i18n?: 'en' | 'zh' | I18nFn;

  /**
   * Logger
   */
  // logger?: LoggerInit;

  /**
   * Builtin command configuration
   */
  builtin?: {
    version?: {
      /**
       * @default true
       */
      enable?: boolean;

      /**
       * @default '-v, --version'
       */
      format?: string | string[];
    };

    help?: {
      /**
       * @default true
       */
      enable?: boolean;

      /**
       * @default '-h, --help'
       */
      format?: string | string[];
    };
  };
};

export type OptionInit<S extends string = string, R = unknown> = {
  /**
   * Option description
   */
  description?: string;

  /**
   * Generate negated option
   */
  negated?: InferOptionRawType<S> extends boolean ? boolean : never;

  /**
   * Overwrite the initial value of the corresponding matched option.
   * - &lt;required&gt;: undefined
   * - \[optional\]: false
   * - \[...remaining\]: \[\]
   */
  initial?: InferOptionRawType<S>;

  /**
   * Cast initial value to the result
   */
  cast?: (value: InferOptionRawType<S>) => R;

  /**
   * Default option value if it is not provided
   */
  default?: R;
};

export type GroupInit<S extends string> = {};

export type CommandInit<S extends string> = {};

export type ArgumentInit<S extends string, I extends unknown, R = unknown> = {
  /**
   * Overwrite the initial value of the corresponding matched option.
   * - &lt;required&gt; : undefined
   * - \[optional\] : undefined
   * - \[...remaining\] : \[\]
   */
  initial?: I;

  /**
   * Cast initial value to the result
   */
  cast?: (value: I extends {} ? I : InferArgumentRawType<S>) => R;

  /**
   * Default argument value if it is not provided
   */
  default?: R;
};
