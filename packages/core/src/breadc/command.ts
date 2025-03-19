import type { Context, OnUnknownOptions } from '../parser/context.ts';

import { defaultOnUnknownOptions } from '../parser/parser.ts';
import { BreadcAppError, ResolveCommandError } from '../error.ts';

import type {
  ActionFn,
  InferOption,
  InferArgumentRawType,
  InferArgumentsType,
  InferArgumentType
} from './infer.ts';
import type { ArgumentType, IArgument, ICommand, IOption } from './types.ts';

import { type OptionConfig, makeOption, Option } from './option.ts';

export interface CommandConfig {
  /**
   * Command description
   */
  description?: string;
}

export interface ArgumentConfig<AF extends string, I extends unknown, R = {}> {
  /**
   * Overwrite the initial value of the corresponding matched option.
   * - &lt;required&gt; : undefined
   * - \[optional\] : undefined
   * - \[...remaining\] : \[\]
   */
  initial?: I;

  /**
   * Cast initial value to the result
   */
  cast?: (value: I extends {} ? I : InferArgumentRawType<AF>) => R;

  /**
   * Default argument value if it is not provided
   */
  default?: R;
}

export interface CommandHooks {
  'pre:action': (this: Command<string>, context: Context) => any;

  'post:action': (this: Command<string>, context: Context, ret: any) => any;
}

/**
 * Command.
 *
 * Support argument:
 * - sub-command
 * - &lt;required&gt;
 * - \[optional\]
 * - \[...remaining\]
 */
export class Command<
  F extends string,
  O extends Record<string, any> = {},
  A extends unknown[] = InferArgumentsType<F>,
  R = any
> {
  readonly format: F;

  readonly config: CommandConfig;

  readonly aliases: string[] = [];

  isDefault: boolean;

  hooks?: { [K in keyof CommandHooks]?: CommandHooks[K][] };

  /**
   * The bound action function
   */
  actionFn: Function | undefined;

  /**
   * The bound arguments
   */
  arguments: IArgument[] = [];

  /**
   * The bound options
   */
  options: IOption[] = [];

  /**
   * Callback on handling unknown options
   */
  onUnknownOptions: OnUnknownOptions | undefined;

  public constructor(format: F, config: CommandConfig = {}) {
    this.format = format;
    this.config = config;
    this.isDefault = format === '' || format[0] === '[' || format[0] === '<';
  }

  public alias(format: string): this {
    if (format === '' || format[0] === '[' || format[0] === '<') {
      this.isDefault = true;
    } else {
      this.aliases.push(format);
    }
    return this;
  }

  public addArgument<
    AF extends string,
    I extends unknown,
    C extends ArgumentConfig<AF, I>
  >(
    argument: Argument<AF, I>
  ): Command<
    F,
    O,
    A extends never ? never : [...A, InferArgumentType<AF, I, C>]
  > {
    this.arguments.push(makeCustomArgument(argument) as IArgument);
    return this as any;
  }

  public argument<
    AF extends string,
    I extends unknown,
    C extends ArgumentConfig<AF, I>
  >(
    format: AF,
    config?: C
  ): Command<
    F,
    O,
    A extends never ? never : [...A, InferArgumentType<AF, I, C>]
  > {
    const argument = new Argument(format, config);
    this.arguments.push(makeCustomArgument(argument) as IArgument);
    return this as any;
  }

  public addOption<OF extends string, C extends OptionConfig<OF>>(
    option: Option<OF, C>
  ): Command<F, O & InferOption<OF, C>, A> {
    this.options.push(makeOption(option));
    return this as any;
  }

  public option<OF extends string, C extends OptionConfig<OF>>(
    format: OF,
    descriptionOrConfig?: string | C,
    config?: Omit<C, 'description'>
  ): Command<F, O & InferOption<OF, C>, A> {
    const resolvedConfig =
      typeof descriptionOrConfig === 'string'
        ? { ...config, description: descriptionOrConfig }
        : { ...descriptionOrConfig, ...config };
    const option = new Option<OF>(format, resolvedConfig);
    this.options.push(makeOption(option));
    return this as any;
  }

  public allowUnknownOptions(
    fn?: boolean | OnUnknownOptions
  ): Command<F, O & { [key in string]: any }, A> {
    if (typeof fn === 'boolean') {
      this.onUnknownOptions = fn ? defaultOnUnknownOptions : undefined;
    } else if (typeof fn === 'function') {
      this.onUnknownOptions = fn;
    } else if (fn === undefined) {
      this.onUnknownOptions = defaultOnUnknownOptions;
    }
    return this;
  }

  /**
   * Bind the action function
   *
   * @param fn action function
   * @returns this
   */
  public action<Fn extends ActionFn<A, O>>(
    fn: A extends never ? never : Fn
  ): Command<F, O, A, ReturnType<Fn>> {
    this.actionFn = fn;
    return this as any;
  }

  /**
   * Register 'pre:action' or 'post:action' hooks
   */
  public hook<E extends keyof CommandHooks>(
    event: E,
    fn: CommandHooks[E]
  ): this {
    if (!this.hooks) this.hooks = {};
    if (!this.hooks[event]) this.hooks[event] = [];
    this.hooks[event].push(fn);
    return this;
  }

  /**
   * Run the action function
   *
   * @param fn action function
   * @returns this
   */
  public run(...args: Parameters<ActionFn<A, O>>): R {
    if (!this.actionFn) {
      throw new BreadcAppError(BreadcAppError.NO_ACTION_BOUND, {
        command: this as unknown as ICommand
      });
    }

    // TODO: use the default values

    return this.actionFn?.(...args);
  }
}

export class Argument<F extends string, I extends unknown> {
  readonly format: F;

  readonly config: ArgumentConfig<F, I>;

  constructor(format: F, config?: ArgumentConfig<F, I>) {
    this.format = format;
    this.config = config ?? ({} as any);
  }
}

export function makeCommand<F extends string = string>(
  _command: Command<F>
): ICommand<F> {
  const command = _command as unknown as ICommand<F>;
  const format = command.format;

  /**
   * Mark whether it has been resolved
   *
   * [  0, i ] := resolving sub-commands
   * [ -1, i ] := sub-commands have been resolved
   * [  1, _ ] := has been fully resolved
   */
  let resolveState: 0 | -1 | 1 = 0,
    i = 0;

  /**
   * Matching position in each alias
   */
  const aliasPos: number[] = [];

  const pieces: string[] = [];
  const aliasPieces: string[][] = [];
  const requireds: IArgument[] = [];
  const optionals: IArgument[] = [];

  command.isDefault = format === '' || format[0] === '[' || format[0] === '<';
  command.pieces = pieces;
  command.aliasPos = aliasPos;
  command.aliasPieces = aliasPieces;
  command.requireds = requireds;
  command.optionals = optionals;
  command.spread = undefined;

  command.resolveSubCommand = () => {
    if (resolveState === 0) {
      for (; i < format.length; ) {
        if (format[i] === '<' || format[i] === '[') {
          resolveState = -1;
          break;
        } else if (format[i] === ' ') {
          while (i < format.length && format[i] === ' ') {
            i++;
          }
        } else {
          let piece = '';
          while (i < format.length && format[i] !== ' ') {
            piece += format[i++];
          }
          pieces.push(piece);
          resolveState = 0;
          break;
        }
      }
      if (i >= format.length) {
        resolveState = -1;
      }
    }
    return command;
  };

  command.resolveAliasSubCommand = (index: number) => {
    const format = command.aliases[index];

    if (aliasPos[index] === undefined) {
      aliasPos[index] = 0;
      aliasPieces[index] = [];
    }

    let i = aliasPos[index];

    for (; i < format.length; ) {
      if (format[i] === '<' || format[i] === '[') {
        throw new ResolveCommandError(
          ResolveCommandError.INVALID_ALIAS_FORMAT,
          { format, position: i }
        );
      } else if (format[i] === ' ') {
        while (i < format.length && format[i] === ' ') {
          i++;
        }
      } else {
        let piece = '';
        while (i < format.length && format[i] !== ' ') {
          piece += format[i++];
        }
        aliasPieces[index].push(piece);
        break;
      }
    }

    aliasPos[index] = i;

    return command;
  };

  command.resolve = () => {
    while (resolveState === 0) {
      command.resolveSubCommand();
    }
    if (resolveState === -1) {
      /**
       * States:
       *
       * 0 := aaa bbb  (0 -> 0, 0 -> 1, 0 -> 2, 0 -> 3)
       * 1 := aaa bbb <xxx> <yyy>  (1 -> 1, 1 -> 2, 1 -> 3)
       * 2 := aaa bbb <xxx> <yyy> [zzz]  (2 -> 2, 2 -> 3)
       * 3 := aaa bbb <xxx> <yyy> [zzz] [...www]  (3 -> empty)
       */
      let state = 1;
      for (; i < format.length; ) {
        if (format[i] === '<') {
          if (i + 1 >= format.length || format[i + 1] === ' ') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_REQUIRED_ARG,
              { format, position: i }
            );
          } else {
            i++;
          }

          if (state >= 2) {
            throw new ResolveCommandError(
              ResolveCommandError.REQUIRED_BEFORE_OPTIONAL,
              { format, position: i }
            );
          }

          // Parse argument name
          let piece = '';
          while (i < format.length && format[i] !== '>') {
            piece += format[i++];
          }

          // Check the close bracket
          if (i === format.length || format[i] !== '>') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_REQUIRED_ARG,
              { format: format, position: i }
            );
          } else {
            i++;
          }

          // Check the space separator
          if (i < format.length && format[i] !== ' ') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_REQUIRED_ARG,
              { format, position: i }
            );
          }

          // Check empty argument name
          if (piece === '') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_EMPTY_ARG,
              { format, position: i }
            );
          }

          // State -> 1
          state = 1;
          requireds.push(makeRawArgument('required', piece));
        } else if (format[i] === '[') {
          if (i + 1 >= format.length || format[i + 1] === ' ') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_OPTIONAL_ARG,
              { format, position: i }
            );
          } else {
            i++;
          }

          if (format[i] === '.') {
            if (state >= 3) {
              throw new ResolveCommandError(
                ResolveCommandError.SPREAD_ONLY_ONCE,
                { format, position: i }
              );
            }

            // Skip all the dots [...
            while (i < format.length && format[i] === '.') {
              i++;
            }

            // Parse argument name
            let piece = '';
            while (i < format.length && format[i] !== ']') {
              piece += format[i++];
            }

            // Check the close bracket
            if (i === format.length || format[i] !== ']') {
              throw new ResolveCommandError(
                ResolveCommandError.INVALID_SPREAD_ARG,
                { format, position: i }
              );
            } else {
              i++;
            }

            // Check the next space separator
            if (i < format.length && format[i] !== ' ') {
              throw new ResolveCommandError(
                ResolveCommandError.INVALID_SPREAD_ARG,
                { format, position: i }
              );
            }

            // Check empty argument name
            if (piece === '') {
              throw new ResolveCommandError(
                ResolveCommandError.INVALID_EMPTY_ARG,
                { format, position: i }
              );
            }

            // State -> 3
            state = 3;
            command.spread = makeRawArgument('spread', piece);
          } else {
            if (state >= 3) {
              throw new ResolveCommandError(
                ResolveCommandError.OPTIONAL_BEFORE_SPREAD,
                { format, position: i }
              );
            }

            // Parse argument name
            let piece = '';
            while (i < format.length && format[i] !== ']') {
              piece += format[i++];
            }

            // Check the close bracket
            if (i === format.length || format[i] !== ']') {
              throw new ResolveCommandError(
                ResolveCommandError.INVALID_OPTIONAL_ARG,
                { format, position: i }
              );
            } else {
              i++;
            }

            // Check the next space separator
            if (i < format.length && format[i] !== ' ') {
              throw new ResolveCommandError(
                ResolveCommandError.INVALID_OPTIONAL_ARG,
                { format, position: i }
              );
            }

            // Check empty argument name
            if (piece === '') {
              throw new ResolveCommandError(
                ResolveCommandError.INVALID_EMPTY_ARG,
                { format, position: i }
              );
            }

            // State -> 2
            state = 2;
            optionals.push(makeRawArgument('optional', piece));
          }
        } else if (format[i] === ' ') {
          // Skip spaces
          while (i < format.length && format[i] === ' ') {
            i++;
          }
        } else {
          throw new ResolveCommandError(
            ResolveCommandError.PIECE_BEFORE_REQUIRED,
            { format, position: i }
          );
        }
      }

      // Append maually added arguments
      for (const argument of command.arguments) {
        switch (argument.type) {
          case 'required': {
            if (state === 1) {
              requireds.push(argument);
            } else {
              throw new ResolveCommandError(
                ResolveCommandError.REQUIRED_BEFORE_OPTIONAL,
                { format, position: i }
              );
            }
            break;
          }
          case 'optional': {
            if (state <= 2) {
              state = 2;
              optionals.push(argument);
            } else {
              throw new ResolveCommandError(
                ResolveCommandError.OPTIONAL_BEFORE_SPREAD,
                { format, position: i }
              );
            }
            break;
          }
          case 'spread': {
            if (command.spread) {
              throw new ResolveCommandError(
                ResolveCommandError.SPREAD_ONLY_ONCE,
                { format, position: i }
              );
            }
            state = 3;
            command.spread = argument;
            break;
          }
        }
      }

      resolveState = 1;
    }

    return command;
  };

  return command;
}

function makeRawArgument(type: ArgumentType, name: string): IArgument<string> {
  const format =
    type === 'required'
      ? `<${name}>`
      : type === 'optional'
        ? `[${name}]`
        : `[...${name}]`;
  return {
    type,
    name,
    format,
    config: {}
  };
}

function makeCustomArgument<F extends string, I extends unknown>(
  argument: Argument<F, I>
): IArgument<F, I> {
  let type: ArgumentType | undefined = undefined;
  let name: string | undefined = undefined;

  const resolve = () => {
    const format = argument.format;
    if ('<' === format[0] && '>' === format[format.length - 1]) {
      type = 'required';
      name = format.slice(1, format.length - 1);
    } else if ('[' === format[0] && ']' === format[format.length - 1]) {
      if (format[1] === '.' && format[2] === '.') {
        type = 'spread';
        for (let i = 1; i < format.length; i++) {
          if (format[i] !== '.') {
            name = format.slice(i, format.length - 1);
            break;
          }
        }
      } else {
        type = 'optional';
        name = format.slice(1, format.length - 1);
      }
    } else {
      throw new ResolveCommandError(ResolveCommandError.INVALID_ARG, {
        format,
        position: -1
      });
    }
  };

  return {
    get type() {
      if (type !== undefined) {
        return type;
      }
      resolve();
      return type!;
    },
    get name() {
      if (name !== undefined) {
        return name;
      }
      resolve();
      if (name === '') {
        throw new ResolveCommandError(ResolveCommandError.INVALID_ARG, {
          format: argument.format,
          position: -1
        });
      }
      return name!;
    },
    format: argument.format,
    config: argument.config
  };
}
