import type {
  Argument,
  ArgumentInit,
  NonNullableArgumentInit,
  Command,
  CommandInit,
  InternalCommand,
  InferArgumentsType,
  InferArgumentRawType
} from './types/index.ts';

export function command<S extends string, I extends CommandInit<S>>(
  spec: S,
  init?: I
): Command<S, I, {}, {}, InferArgumentsType<S>, unknown> {
  const run: InternalCommand = (() => {}) as any;

  run.spec = spec;
  run.init = init as any;

  run.alias = () => {
    return run;
  };
  run.argument = () => {
    return run as any;
  };
  run.option = () => {
    if (!run.options) {
      run.options = [];
    }
    return run;
  };

  run.use = () => {
    if (!run.actionMiddlewares) {
      run.actionMiddlewares = [];
    }
    //
    return run as any;
  };
  run.allowUnknownOptions = () => {
    if (!run.unknownOptionMiddlewares) {
      run.unknownOptionMiddlewares = [];
    }
    //
    return run;
  };

  run.action = (fn: Function) => {
    run.actionFn = fn;
    return run as any;
  };

  return run as any;
}

export function argument<
  Spec extends string,
  Initial extends NonNullable<InferArgumentRawType<Spec>>,
  Cast extends unknown,
  Init extends NonNullableArgumentInit<Spec, Initial, Cast>
>(spec: Spec, init: Init): Argument<Spec, Initial, Cast, Init>;

export function argument<
  Spec extends string,
  Initial extends InferArgumentRawType<Spec>,
  Cast extends unknown,
  Init extends ArgumentInit<Spec, Initial, Cast>
>(spec: Spec, init?: Init): Argument<Spec, Initial, Cast, Init>;

export function argument<
  Spec extends string,
  Initial extends InferArgumentRawType<Spec>,
  Cast extends unknown,
  Init extends ArgumentInit<Spec, Initial, Cast>
>(spec: Spec, init?: Init): Argument<Spec, Initial, Cast, Init> {
  return {
    spec,
    init
  };
}
