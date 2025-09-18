import type {
  Option,
  OptionInit,
  InferOptionInitialType
} from './types/index.ts';

export function option<
  Spec extends string,
  Initial extends InferOptionInitialType<Spec>,
  Init extends OptionInit<Spec, Initial, unknown>
>(spec: Spec, description?: string, init?: Init): Option<Spec, Initial, Init> {
  return {
    spec,
    init
  };
}
