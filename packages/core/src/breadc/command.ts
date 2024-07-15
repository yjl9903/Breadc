import { BreadcError } from '../error.ts';

/**
 * Command abstraction.
 */
export class Command<F extends string = string> {
  public readonly format: F;

  /**
   * The bound action function
   */
  public actionFn: Function | undefined;

  /**
   * Mark whether it has been resolved
   *
   * [  0, _ ]   := has not been resolved
   * [ -1, pos ] := has resolved const pieces
   * [  1, _ ]   := has been fully resolved
   */
  private resolved: [0 | 1, undefined] | [-1, number] = [0, undefined];

  /**
   * Const pieces
   *
   * &nbsp;↓ &nbsp;&nbsp;&nbsp; ↓
   *
   * aaa bbb &lt;xxx&gt; &lt;yyy&gt; [zzz] [...www]
   */
  public pieces!: string[];

  /**
   * Required arguments
   *
   * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
   * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
   * ↓ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ↓
   *
   * aaa bbb &lt;xxx&gt; &lt;yyy&gt; [zzz] [...www]
   */
  public required!: string[];

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
  public optionals!: string[];

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
  public spread: string | undefined;

  public constructor(format: F) {
    this.format = format;
  }

  /**
   * This is used internal, you should not use this API.
   *
   * @returns this
   */
  public resolve(): this {
    if (this.resolved[0] === 0) {
      this.pieces = [];
      let i = 0;
      for (; i < this.format.length; ) {
        if (this.format[i] === '<' || this.format[i] === '[') {
          break;
        } else if (this.format[i] === ' ') {
          while (i < this.format.length && this.format[i] === ' ') {
            i++;
          }
        } else {
          let piece = '';
          while (i < this.format.length && this.format[i] !== ' ') {
            piece += this.format[i++];
          }
          this.pieces.push(piece);
        }
      }
      this.resolved = [-1, i];
    } else if (this.resolved[0] === -1) {
      this.required = [];
      this.optionals = [];

      /**
       * States:
       *
       * 0 := aaa bbb  (0 -> 0, 0 -> 1, 0 -> 2, 0 -> 3)
       * 1 := aaa bbb <xxx> <yyy>  (1 -> 1, 1 -> 2, 1 -> 3)
       * 2 := aaa bbb <xxx> <yyy> [zzz]  (2 -> 2, 2 -> 3)
       * 3 := aaa bbb <xxx> <yyy> [zzz] [...www]  (3 -> empty)
       */
      let state = 1;
      let i = this.resolved[1];
      for (; i < this.format.length; ) {
        if (this.format[i] === '<') {
          if (i + 1 >= this.format.length || this.format[i + 1] === ' ') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_REQUIRED_ARG,
              { format: this.format, position: i }
            );
          } else {
            i++;
          }

          if (state >= 2) {
            throw new ResolveCommandError(
              ResolveCommandError.REQUIRED_BEFORE_OPTIONAL,
              { format: this.format, position: i }
            );
          }

          // Parse argument name
          let piece = '';
          while (i < this.format.length && this.format[i] !== '>') {
            piece += this.format[i++];
          }

          // Check the close bracket
          if (i === this.format.length || this.format[i] !== '>') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_REQUIRED_ARG,
              { format: this.format, position: i }
            );
          } else {
            i++;
          }

          // Check the space separator
          if (i < this.format.length && this.format[i] !== ' ') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_REQUIRED_ARG,
              { format: this.format, position: i }
            );
          }

          // State -> 1
          state = 1;
          this.required.push(piece);
        } else if (this.format[i] === '[') {
          if (i + 1 >= this.format.length || this.format[i + 1] === ' ') {
            throw new ResolveCommandError(
              ResolveCommandError.INVALID_OPTIONAL_ARG,
              { format: this.format, position: i }
            );
          } else {
            i++;
          }

          if (this.format[i] === '.') {
            if (state >= 3) {
              throw new ResolveCommandError(
                ResolveCommandError.SPREAD_ONLY_ONCE,
                { format: this.format, position: i }
              );
            }

            // Skip all the dots [...
            while (i < this.format.length && this.format[i] === '.') {
              i++;
            }

            // Parse argument name
            let piece = '';
            while (i < this.format.length && this.format[i] !== ']') {
              piece += this.format[i++];
            }

            // Check the close bracket
            if (i === this.format.length || this.format[i] !== ']') {
              throw new ResolveCommandError(
                ResolveCommandError.INVALID_SPREAD_ARG,
                { format: this.format, position: i }
              );
            } else {
              i++;
            }

            // Check the space separator
            if (i < this.format.length && this.format[i] !== ' ') {
              throw new ResolveCommandError(
                ResolveCommandError.INVALID_SPREAD_ARG,
                { format: this.format, position: i }
              );
            }

            // State -> 3
            state = 3;
            this.spread = piece;
          } else {
            if (state >= 3) {
              throw new ResolveCommandError(
                ResolveCommandError.OPTIONAL_BEFORE_SPREAD,
                { format: this.format, position: i }
              );
            }

            // Parse argument name
            let piece = '';
            while (i < this.format.length && this.format[i] !== ']') {
              piece += this.format[i++];
            }

            // Check the close bracket
            if (i === this.format.length || this.format[i] !== ']') {
              throw new ResolveCommandError(
                ResolveCommandError.INVALID_OPTIONAL_ARG,
                { format: this.format, position: i }
              );
            } else {
              i++;
            }

            // Check the space separator
            if (i < this.format.length && this.format[i] !== ' ') {
              throw new ResolveCommandError(
                ResolveCommandError.INVALID_OPTIONAL_ARG,
                { format: this.format, position: i }
              );
            }

            // State -> 2
            state = 2;
            this.optionals.push(piece);
          }
        } else if (this.format[i] === ' ') {
          // Skip spaces
          while (i < this.format.length && this.format[i] === ' ') {
            i++;
          }
        } else {
          throw new ResolveCommandError(
            ResolveCommandError.PIECE_BEFORE_REQUIRED,
            { format: this.format, position: i }
          );
        }
      }
      this.resolved = [1, undefined];
    }

    return this;
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

/**
 * Support 3 kinds of arguments
 *
 * - [optional]
 * - <required>
 * - [...remaining]
 */
export class Argument {
  public readonly required: boolean = false;

  public readonly remaining: boolean = false;
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
