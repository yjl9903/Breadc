import { ResolveCommandError } from '../error.ts';

import type {
  ActionMiddleware,
  UnknownOptionMiddleware,
  Option,
  OptionInit,
  InternalOption,
  InferOptionInitialType,
  Command,
  CommandInit,
  InternalCommand,
  Argument,
  ArgumentInit,
  InternalArgument,
  NonNullableArgumentInit,
  ArgumentType,
  InferArgumentsType,
  InferArgumentRawType
} from './types/index.ts';

import { defaultUnknownOptionMiddleware, resolveOptionInput } from './shared.ts';

export function command<S extends string, I extends CommandInit<S>>(
  spec: S,
  init?: I
): Command<S, I, {}, {}, InferArgumentsType<S>, unknown> {
  const run = (() => {
    // TODO: run action
  }) as unknown as InternalCommand;

  const aliases: string[] = [];
  const args: InternalArgument[] = [];
  const options: InternalOption[] = [];

  run.spec = spec;
  run.init = init;

  run._aliases = aliases;
  run._options = options;
  run._arguments = args;

  run.alias = (spec: string) => {
    aliases.push(spec);
    return run;
  };

  run.argument = <
    Spec extends string,
    Initial extends InferArgumentRawType<Spec>,
    Cast extends unknown,
    Init extends ArgumentInit<Spec, Initial, Cast>
  >(
    spec: Spec | Argument<Spec>,
    init?: Init
  ) => {
    const arg = typeof spec === 'string' ? argument(spec, init as any) : spec;
    args.push(arg as unknown as InternalArgument);
    return run as any;
  };

  run.option = <Spec extends string, Initial extends InferOptionInitialType<Spec>, I extends OptionInit<Spec, Initial>>(
    spec: Spec | Option<Spec>,
    description?: string,
    init?: I
  ) => {
    options.push(resolveOptionInput(spec, description, init));
    return run;
  };

  run.use = <Middleware extends ActionMiddleware>(middleware: Middleware) => {
    if (!run._actionMiddlewares) {
      run._actionMiddlewares = [];
    }
    run._actionMiddlewares.push(middleware);
    return run;
  };

  run.allowUnknownOption = (middleware?: UnknownOptionMiddleware<{}>) => {
    if (!run._unknownOptionMiddlewares) {
      run._unknownOptionMiddlewares = [];
    }
    if (typeof middleware === 'function') {
      run._unknownOptionMiddlewares.push(middleware);
    } else {
      run._unknownOptionMiddlewares.push(defaultUnknownOptionMiddleware);
    }
    return run;
  };

  run.action = (fn: (...args: any[]) => unknown) => {
    run._actionFn = fn;
    return run as any;
  };

  return run as unknown as Command<S, I, {}, {}, InferArgumentsType<S>, unknown>;
}

export function rawArgument(type: ArgumentType, name: string): InternalArgument {
  return {
    spec: '',
    type,
    name,
    init: {}
  };
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
  let type: ArgumentType | undefined;
  let name: string | undefined;

  if ('<' === spec[0] && '>' === spec[spec.length - 1]) {
    type = 'required';
    name = spec.slice(1, spec.length - 1);
  } else if ('[' === spec[0] && ']' === spec[spec.length - 1]) {
    if (spec[1] === '.' && spec[2] === '.') {
      type = 'spread';
      for (let i = 1; i < spec.length; i++) {
        if (spec[i] !== '.') {
          name = spec.slice(i, spec.length - 1);
          break;
        }
      }
    } else {
      type = 'optional';
      name = spec.slice(1, spec.length - 1);
    }
  } else {
    throw new ResolveCommandError(ResolveCommandError.INVALID_ARG, {
      spec,
      position: -1
    });
  }

  return (<InternalArgument>{
    spec,
    type: type!,
    name: name!,
    init
  }) as unknown as Argument<Spec, Initial, Cast, Init>;
}
