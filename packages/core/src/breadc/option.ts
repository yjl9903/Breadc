import type { Option, OptionInit, CheckedOptionInit, InternalOption, OptionType } from './types/index.ts';

export function option<Spec extends string, Init extends OptionInit<Spec>>(
  spec: Spec,
  description?: string,
  init?: CheckedOptionInit<Spec, Init>
): Option<Spec, Init> {
  const option: InternalOption = {
    spec,
    description,
    init: { ...(init as unknown as InternalOption['init']) },
    type: undefined as unknown as OptionType,
    long: ''
  };

  return option as unknown as Option<Spec, Init>;
}

export function rawOption(
  spec: string,
  description: string | undefined,
  type: OptionType,
  long: string,
  short: string | undefined,
  init: InternalOption['init']
): InternalOption {
  return {
    spec,
    description,
    init,
    type,
    form: type === 'boolean' ? 'positive' : undefined,
    long,
    short
  } as InternalOption;
}
