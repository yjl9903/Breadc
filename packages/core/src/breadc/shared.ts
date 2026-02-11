import type { InternalOption, Option, OptionInit, UnknownOptionMiddleware } from './types/index.ts';

import { option as makeOption } from './option.ts';

export function resolveOptionInput<Spec extends string, Init extends OptionInit<Spec, any, unknown>>(
  spec: Spec | Option<Spec>,
  description?: string,
  init?: Init
): InternalOption {
  const resolved =
    typeof spec === 'string' ? makeOption(spec, description, init as unknown as OptionInit<Spec, any, unknown>) : spec;
  return resolved as unknown as InternalOption;
}

export const defaultUnknownOptionMiddleware: UnknownOptionMiddleware<any> = (_ctx, key, value) => ({
  name: key,
  value
});
