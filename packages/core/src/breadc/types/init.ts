import type {
  InferOptionCastInput,
  InferOptionDefaultType,
  InferArgumentDefaultType,
  InferArgumentCastInput
} from './infer.ts';

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

export type ArgumentInit<Spec extends string, Cast = unknown> = {
  /** Raw input used only when the argument is absent. Required arguments cannot have defaults. */
  default?: InferArgumentDefaultType<Spec> | undefined;

  /** Convert the selected string or complete spread array once per parse. */
  cast?: (value: InferArgumentCastInput<Spec>) => Cast;
};

/** Reject configuration keys outside the argument API. */
export type CheckedArgumentInit<Spec extends string, Init extends ArgumentInit<Spec>> = Init &
  Record<Exclude<keyof Init, keyof ArgumentInit<Spec>>, never>;
