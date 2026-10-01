import type { StandardSchemaV1 } from '@standard-schema/spec';

/** A synchronous CLI converter or a Standard Schema V1 validator. */
export type Cast<Input, Output = unknown> = ((value: Input) => Output) | StandardSchemaV1<unknown, Output>;

/** Protocol output takes precedence, including for callable schemas. */
export type InferCastOutput<C> = C extends StandardSchemaV1
  ? StandardSchemaV1.InferOutput<C>
  : C extends (...args: any[]) => infer Output
    ? Output
    : never;
