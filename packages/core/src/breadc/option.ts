import type { OptionInit, Option } from './types/index.ts';

export function option<S extends string, I extends OptionInit<S>>(
  spec: S,
  init?: I
): Option<S, I> {
  return {
    spec,
    init
  };
}
