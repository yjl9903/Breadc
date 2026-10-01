import type { Option, Argument } from '../breadc/types/app.ts';
import type { InternalOption, InternalArgument, OptionType } from '../breadc/types/internal.ts';

import { RuntimeError } from '../error.ts';

import type { Token } from './lexer.ts';
import type { Context } from './context.ts';

export class MatchedArgument {
  public readonly argument: InternalArgument;

  public readonly token: Token | undefined;

  public dirty = false;

  public raw: string | string[] | undefined;

  public constructor(argument: Argument<string, any, any> | InternalArgument) {
    this.argument = argument;
    if (argument.init?.initial !== undefined) {
      this.raw = argument.init.initial;
    } else {
      switch (argument.type) {
        case 'required': {
          this.raw = '';
          break;
        }
        case 'optional': {
          this.raw = undefined;
          break;
        }
        case 'spread': {
          this.raw = [];
          break;
        }
      }
    }
  }

  public value<T = any>(): T {
    if (this.dirty || this.argument.init?.default === undefined) {
      const cast = this.argument.init?.cast;
      return cast ? (cast(this.raw) as T) : (this.raw as T);
    } else {
      return this.argument.init.default as T;
    }
  }

  public accept(context: Context, value: string | string[] | undefined) {
    switch (this.argument.type) {
      case 'optional': {
        if (this.dirty) {
          throw new RuntimeError(RuntimeError.OPTIONAL_ARGUMENT_ACCEPT_ONCE, {
            context,
            argument: this.argument,
            value
          });
        }
        this.raw = value ?? this.argument.init?.initial ?? undefined;
        this.dirty = true;
        return this;
      }
      case 'required': {
        if (this.dirty) {
          throw new RuntimeError(RuntimeError.REQUIRED_ARGUMENT_ACCEPT_ONCE, {
            context,
            argument: this.argument,
            value
          });
        }
        this.raw = value ?? this.argument.init?.initial ?? '';
        this.dirty = true;
        return this;
      }
      case 'spread': {
        (this.raw as string[]).push((value ?? this.argument.init?.initial ?? '') as string);
        this.dirty = true;
        return this;
      }
      /* v8 ignore next -- @preserve */
      default: {
        /* v8 ignore next -- @preserve */
        return this;
      }
    }
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
          throw new RuntimeError(RuntimeError.BOOLEAN_OPTION_ACCEPT_ONCE, {
            context,
            option: this.option,
            name: long,
            value: text
          });
        }

        let value = true;
        if (text !== undefined) {
          const normalized = text.toLowerCase();
          if (FALSE_OPTION.includes(normalized)) {
            value = false;
          } else if (!TRUE_OPTION.includes(normalized)) {
            throw new RuntimeError(`${RuntimeError.INVALID_BOOLEAN_OPTION_VALUE}: --${this.option.long}`, {
              context,
              option: this.option,
              name: long,
              value: text
            });
          }
        }
        this.raw = inverted ? !value : value;

        this.dirty = true;

        break;
      }
      case 'optional': {
        if (this.dirty) {
          throw new RuntimeError(RuntimeError.OPTIONAL_OPTION_ACCEPT_ONCE, {
            context,
            option: this.option,
            name: long,
            value: text
          });
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
            throw new RuntimeError(RuntimeError.REQUIRED_OPTION_ACCEPT_ONCE, {
              context,
              option: this.option,
              name: long,
              value
            });
          }

          if (value === undefined) {
            throw new RuntimeError(`${RuntimeError.REQUIRED_OPTION_VALUE_MISSING}: --${this.option.long}`, {
              context,
              option: this.option,
              name: long,
              value
            });
          }
          this.raw = value;
        } else {
          if (value === undefined) {
            throw new RuntimeError(`${RuntimeError.REQUIRED_OPTION_VALUE_MISSING}: --${this.option.long}`, {
              context,
              option: this.option,
              name: long,
              value
            });
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
