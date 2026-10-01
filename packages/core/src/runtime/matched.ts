import type { Option, Argument } from '../breadc/types/app.ts';
import type { InternalOption, InternalArgument, OptionType } from '../breadc/types/internal.ts';

import { InputError, InternalError, ErrorCode } from '../error.ts';

import type { Token } from './lexer.ts';
import type { Context } from './context.ts';

export class MatchedArgument {
  public readonly argument: InternalArgument;

  public readonly token: Token | undefined;

  public dirty = false;

  public raw: string | string[] | undefined;

  private resolved = false;

  private result: any;

  public constructor(argument: Argument<string, any> | InternalArgument) {
    this.argument = argument;
    const fallback = argument.init.default;
    this.raw =
      fallback !== undefined
        ? Array.isArray(fallback)
          ? [...fallback]
          : fallback
        : argument.type === 'spread'
          ? []
          : undefined;
  }

  /** Called only after the final parse pass has passed syntax validation. */
  public finalize() {
    if (!this.resolved) {
      const shouldCast = this.dirty || this.argument.init.default !== undefined || this.argument.type === 'spread';
      this.result = shouldCast && this.argument.init.cast ? this.argument.init.cast(this.raw!) : this.raw;
      this.resolved = true;
    }
    return this;
  }

  /** Reading during matching never triggers business conversion. */
  public value<T = any>(): T {
    return this.resolved ? this.result : (this.raw as T);
  }

  public accept(context: Context, value: string) {
    if (this.argument.type === 'spread') {
      if (!this.dirty) {
        this.raw = [];
      }
      (this.raw as string[]).push(value);
    } else {
      if (this.dirty) {
        throw new InternalError(
          ErrorCode.ARGUMENT_ALREADY_BOUND,
          this.argument.type === 'required'
            ? 'Required argument can only be assigned once'
            : 'Optional argument can only be assigned once',
          { context, details: { argument: this.argument, value } }
        );
      }
      this.raw = value;
    }
    this.dirty = true;
    return this;
  }
}

const TRUE_OPTION = ['true', 't', 'yes', 'y', 'on', '1'];
const FALSE_OPTION = ['false', 'f', 'no', 'n', 'off', '0'];

export class MatchedOption {
  public readonly option: InternalOption;

  public dirty = false;

  public raw: any;

  private resolved = false;

  private result: any;

  public constructor(option: Option<string, any> | InternalOption) {
    this.option = option as InternalOption;
    const fallback = option.init.default;
    if (fallback !== undefined) {
      this.raw = Array.isArray(fallback) ? [...fallback] : fallback;
    } else if (this.option.type === 'boolean') {
      this.raw = this.option.form === 'negative';
    } else {
      this.raw = this.option.type === 'spread' ? [] : undefined;
    }
  }

  /** Called only after the final parse pass has passed syntax validation. */
  public finalize() {
    if (!this.resolved) {
      const shouldCast =
        this.dirty ||
        this.option.init.default !== undefined ||
        this.option.type === 'boolean' ||
        this.option.type === 'spread';
      this.result = shouldCast && this.option.init.cast ? this.option.init.cast(this.raw) : this.raw;
      this.resolved = true;
    }
    return this;
  }

  /** During matching, middleware can inspect raw input without triggering cast. */
  public value<T = any>(): T {
    return this.resolved ? this.result : this.raw;
  }

  public accept(context: Context, long: string, text: string | undefined, inverted = false) {
    switch (this.option.type) {
      case 'boolean': {
        if (this.dirty) {
          throw new InputError(
            [
              {
                code: ErrorCode.DUPLICATE_OPTION,
                message: 'Boolean option can only be assigned once',
                option: this.option,
                name: long,
                value: text
              }
            ],
            { context }
          );
        }

        let value = true;
        if (text !== undefined) {
          const normalized = text.toLowerCase();
          if (FALSE_OPTION.includes(normalized)) {
            value = false;
          } else if (!TRUE_OPTION.includes(normalized)) {
            throw new InputError(
              [
                {
                  code: ErrorCode.INVALID_BOOLEAN_OPTION_VALUE,
                  message: `Invalid boolean option value: --${this.option.long}`,
                  option: this.option,
                  name: long,
                  value: text
                }
              ],
              { context }
            );
          }
        }
        this.raw = inverted ? !value : value;

        this.dirty = true;

        break;
      }
      case 'optional': {
        if (this.dirty) {
          throw new InputError(
            [
              {
                code: ErrorCode.DUPLICATE_OPTION,
                message: 'Optional option can only be assigned once',
                option: this.option,
                name: long,
                value: text
              }
            ],
            { context }
          );
        }

        // Handle optional options
        let value = text;
        if (value === undefined) {
          const token = context.tokens.peek();
          if (token && !token.isEscape && !token.isOption) {
            value = token.toRaw();
            context.tokens.next();
          }
        }

        this.raw = value;

        this.dirty = true;

        break;
      }
      case 'required':
      case 'spread': {
        // Handle required / array options
        let value = text;
        if (value === undefined) {
          // Try next token
          const token = context.tokens.peek();
          if (token && !token.isEscape && !token.isOption) {
            value = token.toRaw();
            context.tokens.next();
          }
        }

        // Set option value
        if (this.option.type === 'required') {
          if (this.dirty) {
            throw new InputError(
              [
                {
                  code: ErrorCode.DUPLICATE_OPTION,
                  message: 'Required option can only be assigned once',
                  option: this.option,
                  name: long,
                  value
                }
              ],
              { context }
            );
          }

          if (value === undefined) {
            throw new InputError(
              [
                {
                  code: ErrorCode.MISSING_OPTION_VALUE,
                  message: `Missing required option value: --${this.option.long}`,
                  option: this.option,
                  name: long
                }
              ],
              { context }
            );
          }
          this.raw = value;
        } else {
          if (value === undefined) {
            throw new InputError(
              [
                {
                  code: ErrorCode.MISSING_OPTION_VALUE,
                  message: `Missing required option value: --${this.option.long}`,
                  option: this.option,
                  name: long
                }
              ],
              { context }
            );
          }
          if (!this.dirty) {
            this.raw = [];
          }
          this.raw.push(value);
        }

        this.dirty = true;

        break;
      }
    }
    return this;
  }
}

export interface MatchedUnknownOption<T = any> {
  name: string;

  type?: OptionType;

  value: T;
}
