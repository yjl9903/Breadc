import { BreadcError } from '../error.ts';

import type { ICommand, IOption } from './types.ts';

export interface CommandConfig {
  /**
   * Command description
   */
  description?: string;
}

/**
 * Command abstraction.
 *
 * Support argument:
 * - sub-command
 * - <required>
 * - [optional]
 * - [...remaining]
 */
export class Command<F extends string = string> {
  public readonly format: F;

  public readonly config: CommandConfig;

  /**
   * The bound action function
   */
  public actionFn: Function | undefined;

  /**
   * The bound options
   */
  public options: IOption[] = [];

  public constructor(format: F, config: CommandConfig = {}) {
    this.format = format;
    this.config = config;
  }

  /**
   * Bind the action function
   *
   * @param fn action function
   * @returns this
   */
  public action(fn: Function): this {
    this.actionFn = fn;
    return this;
  }
}

export function makeCommand<F extends string = string>(
  command: Command<F>
): ICommand<F> {
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

  const pieces: string[] = [];
  let required!: string[];
  let optionals!: string[];
  let spread: string | undefined;

  const madeCommand = {
    command,
    /**
     * Const pieces
     *
     * &nbsp;↓ &nbsp;&nbsp;&nbsp; ↓
     *
     * aaa bbb &lt;xxx&gt; &lt;yyy&gt; [zzz] [...www]
     */
    pieces,
    /**
     * Required arguments
     *
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
     * ↓ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ↓
     *
     * aaa bbb &lt;xxx&gt; &lt;yyy&gt; [zzz] [...www]
     */
    required,
    /**
     * Optional arguments
     *
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
     * &nbsp;&nbsp;&nbsp;
     * ↓
     *
     * aaa bbb &lt;xxx&gt; &lt;yyy&gt; [zzz] [...www]
     */
    optionals,
    /**
     * Spread arguments
     *
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
     * ↓
     *
     * aaa bbb &lt;xxx&gt; &lt;yyy&gt; [zzz] [...www]
     */
    spread,
    isDefault() {
      return format === '' || format[0] === '[' || format[0] === '<';
    },
    /**
     * This is used internal, you should not use this API.
     */
    resolveSubCommand() {
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
          resolveState = 1;
        }
      }

      return madeCommand;
    },
    /**
     * This is used internal, you should not use this API.
     */
    resolve() {
      while (resolveState === 0) {
        madeCommand.resolveSubCommand();
      }
      if (resolveState === -1) {
        required = madeCommand.required = [];
        optionals = madeCommand.optionals = [];

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

            // State -> 1
            state = 1;
            required.push(piece);
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

              // Check the space separator
              if (i < format.length && format[i] !== ' ') {
                throw new ResolveCommandError(
                  ResolveCommandError.INVALID_SPREAD_ARG,
                  { format, position: i }
                );
              }

              // State -> 3
              state = 3;
              madeCommand.spread = spread = piece;
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

              // Check the space separator
              if (i < format.length && format[i] !== ' ') {
                throw new ResolveCommandError(
                  ResolveCommandError.INVALID_OPTIONAL_ARG,
                  { format, position: i }
                );
              }

              // State -> 2
              state = 2;
              optionals.push(piece);
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

        resolveState = 1;
      }

      return madeCommand;
    }
  };

  return madeCommand;
}

export class ResolveCommandError extends BreadcError {
  static INVALID_REQUIRED_ARG = 'Resolving invalid required argument';

  static INVALID_OPTIONAL_ARG = 'Resolving invalid optional argument';

  static INVALID_SPREAD_ARG = 'Resolving invalid spread argument';

  static PIECE_BEFORE_REQUIRED =
    'Sub-command should be placed in the beginning';

  static REQUIRED_BEFORE_OPTIONAL =
    'Required argument should be placed before optional arguments';

  static OPTIONAL_BEFORE_SPREAD =
    'Optional argument should be placed before spread arguments';

  static SPREAD_ONLY_ONCE = 'Spread argument can only appear once';

  public constructor(
    message: string,
    cause: { format: string; position: number }
  ) {
    super(
      `${message} at the command "${cause.format}", position ${cause.position}`
    );
  }
}
