import { ResolveCommandError } from '../error.ts';

import type {
  ActionMiddleware,
  UnknownOptionMiddleware,
  Option,
  OptionInit,
  InternalOption,
  InferOptionInitialType,
  InternalGroup,
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

import { option as makeOption } from './option.ts';

export function command<S extends string, I extends CommandInit<S>>(
  spec: S,
  init?: I
): Command<S, I, {}, {}, InferArgumentsType<S>, unknown> {
  const run: InternalCommand = (() => {}) as any;

  const aliases: string[] = [];
  const args: InternalArgument[] = [];
  const options: InternalOption[] = [];

  run.spec = spec;
  run.init = init as any;

  run._options = options;

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

  run.option = <
    Spec extends string,
    Initial extends InferOptionInitialType<Spec>,
    I extends OptionInit<Spec, Initial>
  >(
    spec: Spec | Option<Spec>,
    description?: string,
    init?: I
  ) => {
    const option =
      typeof spec === 'string'
        ? makeOption(
            spec,
            description,
            init as unknown as OptionInit<
              Spec,
              InferOptionInitialType<Spec>,
              unknown
            >
          )
        : spec;
    options.push(option as unknown as InternalOption);
    return run;
  };

  run.use = <Middleware extends ActionMiddleware>(middleware: Middleware) => {
    if (!run._actionMiddlewares) {
      run._actionMiddlewares = [];
    }
    run._actionMiddlewares.push(middleware);
    return run as any;
  };

  run.allowUnknownOptions = (
    middleware?: boolean | UnknownOptionMiddleware<{}>
  ) => {
    if (!run._unknownOptionMiddlewares) {
      run._unknownOptionMiddlewares = [];
    }
    if (typeof middleware === 'function') {
      run._unknownOptionMiddlewares.push(middleware);
    } else {
      run._unknownOptionMiddlewares.push((_ctx, key, value) => ({
        name: key,
        value
      }));
    }
    return run;
  };

  run.action = (fn: Function) => {
    run._actionFn = fn;
    return run as any;
  };

  run._resolve = (group?: InternalGroup) => {
    if (run._pieces) return;

    let i = 0;

    const parent = group?._pieces[0] ?? [];
    const pieces: string[] = [...parent];

    // 1. Resolve const pieces
    for (; i < spec.length; ) {
      if (spec[i] === '<' || spec[i] === '[') {
        break;
      } else if (spec[i] === ' ') {
        while (i < spec.length && spec[i] === ' ') {
          i++;
        }
      } else {
        let j = i;
        while (j < spec.length && spec[j] !== ' ') {
          j++;
        }
        pieces.push(spec.slice(i, j));
        i = j;
      }
    }

    // 2. Resolve arguments
    /**
     * States:
     *
     * 0 := aaa bbb  (0 -> 0, 0 -> 1, 0 -> 2, 0 -> 3)
     * 1 := aaa bbb <xxx> <yyy>  (1 -> 1, 1 -> 2, 1 -> 3)
     * 2 := aaa bbb <xxx> <yyy> [zzz]  (2 -> 2, 2 -> 3)
     * 3 := aaa bbb <xxx> <yyy> [zzz] [...www]  (3 -> empty)
     */
    let state = 1;

    const resolvedArguments: InternalArgument[] = [];
    let spread: InternalArgument | undefined;

    for (; i < spec.length; ) {
      if (spec[i] === '<') {
        if (i + 1 >= spec.length || spec[i + 1] === ' ') {
          throw new ResolveCommandError(
            ResolveCommandError.INVALID_REQUIRED_ARG,
            { spec, position: i }
          );
        } else {
          i++;
        }

        if (state >= 2) {
          throw new ResolveCommandError(
            ResolveCommandError.REQUIRED_BEFORE_OPTIONAL,
            { spec, position: i }
          );
        }

        // Parse argument name
        let piece = '';
        while (i < spec.length && spec[i] !== '>') {
          piece += spec[i++];
        }

        // Check the close bracket
        if (i === spec.length || spec[i] !== '>') {
          throw new ResolveCommandError(
            ResolveCommandError.INVALID_REQUIRED_ARG,
            { spec: spec, position: i }
          );
        } else {
          i++;
        }

        // Check the space separator
        if (i < spec.length && spec[i] !== ' ') {
          throw new ResolveCommandError(
            ResolveCommandError.INVALID_REQUIRED_ARG,
            { spec, position: i }
          );
        }

        // Check empty argument name
        if (piece === '') {
          throw new ResolveCommandError(ResolveCommandError.INVALID_EMPTY_ARG, {
            spec,
            position: i
          });
        }

        // State -> 1
        state = 1;
        resolvedArguments.push(rawArgument('required', piece));
      } else if (spec[i] === '[') {
        if (i + 1 >= spec.length || spec[i + 1] === ' ') {
          throw new ResolveCommandError(
            ResolveCommandError.INVALID_OPTIONAL_ARG,
            { spec, position: i }
          );
        } else {
          i++;
        }

        if (spec[i] === '.') {
          if (state >= 3) {
            throw new ResolveCommandError(
              ResolveCommandError.SPREAD_ONLY_ONCE,
              { spec, position: i }
            );
          }

          // Skip all the dots [...
          while (i < spec.length && spec[i] === '.') {
            i++;
          }

          // Parse argument name
          let piece = '';
          while (i < spec.length && spec[i] !== ']') {
            piece += spec[i++];
          }

          // Check the close bracket
          if (i === spec.length || spec[i] !== ']') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_SPREAD_ARG,
              { spec, position: i }
            );
          } else {
            i++;
          }

          // Check the next space separator
          if (i < spec.length && spec[i] !== ' ') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_SPREAD_ARG,
              { spec, position: i }
            );
          }

          // Check empty argument name
          if (piece === '') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_EMPTY_ARG,
              { spec, position: i }
            );
          }

          // State -> 3
          state = 3;
          spread = rawArgument('spread', piece);
          resolvedArguments.push(spread);
        } else {
          if (state >= 3) {
            throw new ResolveCommandError(
              ResolveCommandError.OPTIONAL_BEFORE_SPREAD,
              { spec, position: i }
            );
          }

          // Parse argument name
          let piece = '';
          while (i < spec.length && spec[i] !== ']') {
            piece += spec[i++];
          }

          // Check the close bracket
          if (i === spec.length || spec[i] !== ']') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_OPTIONAL_ARG,
              { spec, position: i }
            );
          } else {
            i++;
          }

          // Check the next space separator
          if (i < spec.length && spec[i] !== ' ') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_OPTIONAL_ARG,
              { spec, position: i }
            );
          }

          // Check empty argument name
          if (piece === '') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_EMPTY_ARG,
              { spec, position: i }
            );
          }

          // State -> 2
          state = 2;
          resolvedArguments.push(rawArgument('optional', piece));
        }
      } else if (spec[i] === ' ') {
        // Skip spaces
        while (i < spec.length && spec[i] === ' ') {
          i++;
        }
      } else {
        throw new ResolveCommandError(
          ResolveCommandError.PIECE_BEFORE_REQUIRED,
          { spec, position: i }
        );
      }
    }

    // 3. Append maually added arguments
    for (const argument of args) {
      switch (argument.type) {
        case 'required': {
          if (state === 1) {
            resolvedArguments.push(argument);
          } else {
            throw new ResolveCommandError(
              ResolveCommandError.REQUIRED_BEFORE_OPTIONAL,
              { spec, position: i }
            );
          }
          break;
        }
        case 'optional': {
          if (state <= 2) {
            state = 2;
            resolvedArguments.push(argument);
          } else {
            throw new ResolveCommandError(
              ResolveCommandError.OPTIONAL_BEFORE_SPREAD,
              { spec, position: i }
            );
          }
          break;
        }
        case 'spread': {
          if (spread) {
            throw new ResolveCommandError(
              ResolveCommandError.SPREAD_ONLY_ONCE,
              { spec, position: i }
            );
          }
          state = 3;
          spread = argument;
          resolvedArguments.push(argument);
          break;
        }
      }
    }

    // 4. Finish
    run._arguments = resolvedArguments;
    if (pieces.length === 0) {
      run._default = true;
    }

    // 5. Resolve aliases
    if (aliases.length > 0) {
      const resolvedAliases: string[][] = [pieces];
      for (const spec of aliases) {
        const aliasPieces: string[] = [...parent];
        for (let i = 0; i < spec.length; ) {
          if (spec[i] === '<' || spec[i] === '[') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_ALIAS_FORMAT,
              { spec, position: i }
            );
          } else if (spec[i] === ' ') {
            while (i < spec.length && spec[i] === ' ') {
              i++;
            }
          } else {
            let j = i;
            while (j < spec.length && spec[j] !== ' ') {
              j++;
            }
            aliasPieces.push(spec.slice(i, j));
            i = j;
          }
        }
        if (aliasPieces.length === 0) {
          run._default = true;
        } else {
          resolvedAliases.push(aliasPieces);
        }
      }
      run._pieces = resolvedAliases;
    } else {
      run._pieces = [pieces];
    }

    return run;
  };

  return run as unknown as Command<
    S,
    I,
    {},
    {},
    InferArgumentsType<S>,
    unknown
  >;
}

export function rawArgument(
  type: ArgumentType,
  name: string
): InternalArgument {
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
