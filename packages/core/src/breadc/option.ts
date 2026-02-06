import type { Option, OptionInit, InferOptionInitialType, InternalOption, OptionType } from './types/index.ts';

export function option<
  Spec extends string,
  Initial extends InferOptionInitialType<Spec>,
  Init extends OptionInit<Spec, Initial, unknown>
>(spec: Spec, description?: string, init?: Init): Option<Spec, Initial, Init> {
  const option: InternalOption = {
    spec,
    init: {
      description,
      ...(init as unknown as InternalOption['init'])
    },

    type: undefined as unknown as OptionType,
    long: ''
  };

  return option as unknown as Option<Spec, Initial, Init>;
}

export function rawOption(
  type: OptionType,
  long: string,
  short: string | undefined,
  init: InternalOption['init']
): InternalOption {
  return {
    spec: '',
    init,
    type,
    long,
    short
  } as InternalOption;
}
