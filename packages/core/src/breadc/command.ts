import type {
  Command,
  Argument,
  CommandInit,
  ArgumentInit,
  InferArgumentsType
} from './types/index.ts';

export function command<S extends string, I extends CommandInit<S>>(
  spec: S,
  init?: I
): Command<S, I, {}, InferArgumentsType<S>, unknown> {
  const run: Command<S, I, {}> = (() => {}) as any;
  run.spec = spec;
  run.init = init;
  return run;
}

export function argument<
  Spec extends string,
  Input extends unknown,
  Init extends ArgumentInit<Spec, Input>
>(spec: Spec, init?: Init): Argument<Spec, Input> {
  return {
    spec,
    init
  };
}
