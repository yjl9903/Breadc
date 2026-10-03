import type {
  InferOptionCastInput,
  InferOptionDefaultType,
  InferArgumentDefaultType,
  InferArgumentCastInput
} from './infer.ts';
import type { Cast } from './cast.ts';
import type { AppDescription } from './description.ts';

export type BreadcInit = {
  /**
   * CLI app version
   */
  version?: string;

  /**
   * CLI app description
   */
  description?: AppDescription;
};

export type OptionInit<Spec extends string, Output = unknown> = {
  /** Raw input used only when the option is absent. It also passes through cast. */
  default?: InferOptionDefaultType<Spec>;

  /** Convert and validate the selected input (the complete array for spread options) once per parse. */
  cast?: Cast<InferOptionCastInput<Spec>, Output>;
};

/** Reject configuration keys outside the option API. */
export type CheckedOptionInit<Spec extends string, Init extends OptionInit<Spec>> = Init &
  Record<Exclude<keyof Init, keyof OptionInit<Spec>>, never>;

export type GroupInit<Spec extends string> = {};

export type CommandInit<Spec extends string> = {};

export type ArgumentInit<Spec extends string, Output = unknown> = {
  /** Raw input used only when the argument is absent. Required arguments cannot have defaults. */
  default?: InferArgumentDefaultType<Spec> | undefined;

  /** Convert the selected string or complete spread array once per parse. */
  cast?: Cast<InferArgumentCastInput<Spec>, Output>;
};

/** Reject configuration keys outside the argument API. */
export type CheckedArgumentInit<Spec extends string, Init extends ArgumentInit<Spec>> = Init &
  Record<Exclude<keyof Init, keyof ArgumentInit<Spec>>, never>;
