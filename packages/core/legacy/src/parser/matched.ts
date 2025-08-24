import type { IOption } from '../breadc/types';
import type { IArgument } from '../breadc/types';

import type { Token } from './lexer.ts';
import type { Context } from './context.ts';

export class MatchedArgument {
  readonly argument: IArgument;

  readonly token: Token | undefined;

  dirty = false;

  raw: any;

  public constructor(argument: IArgument) {
    this.argument = argument;
    if (argument.config.initial !== undefined) {
      this.raw = argument.config.initial;
    } else {
      switch (argument.type) {
        case 'required':
        case 'optional':
          this.raw = undefined;
          break;
        case 'spread':
          this.raw = [];
          break;
      }
    }
  }

  public get value() {
    if (this.dirty || this.argument.config.default === undefined) {
      const cast = this.argument.config.cast;
      return cast ? cast(this.raw) : this.raw;
    } else {
      return this.argument.config.default;
    }
  }

  public accept(_context: Context, text: undefined | string | string[]) {
    this.dirty = true;
    this.raw = text;
    return this;
  }
}

export class MatchedOption {
  static FALSE_OPTION = ['false', 'f', 'no', 'n', 'off'];

  readonly option: IOption;

  dirty = false;

  raw: any;

  public constructor(option: IOption) {
    this.option = option;
    if (option.config.initial !== undefined) {
      this.raw = option.config.initial;
    } else {
      switch (option.type) {
        case 'boolean':
        case 'optional':
          this.raw = false;
          break;
        case 'required':
          this.raw = undefined;
          break;
        case 'array':
          this.raw = [];
          break;
      }
    }
  }

  public get value() {
    if (this.dirty || this.option.config.default === undefined) {
      const cast = this.option.config.cast;
      return cast ? cast(this.raw) : this.raw;
    } else {
      return this.option.config.default;
    }
  }

  public accept(context: Context, long: string, text: undefined | string) {
    switch (this.option.type) {
      case 'boolean': {
        if (text !== undefined) {
          const value = text.toLowerCase();
          if (!long.startsWith('--no-')) {
            this.raw = MatchedOption.FALSE_OPTION.includes(value)
              ? false
              : true;
          } else {
            this.raw = MatchedOption.FALSE_OPTION.includes(value)
              ? true
              : false;
          }
        } else {
          if (!long.startsWith('--no-')) {
            this.raw = true;
          } else {
            this.raw = false;
          }
        }
        break;
      }
      case 'optional': {
        // Handle optional options
        let value = text;
        if (value === undefined) {
          const token = context.tokens.peek();
          if (
            token &&
            !token.isEscape &&
            !token.isLong &&
            (!token.isShort || token.isNegativeNumber)
          ) {
            value = token.toRaw();
            context.tokens.next();
          }
        }

        // Set option value
        //  1. set option value text
        //  2. set option true
        if (value !== undefined) {
          this.raw = value;
        } else {
          this.raw = true;
        }
        this.dirty = true;

        break;
      }
      case 'required':
      case 'array': {
        // Handle required / array options
        let value = text;
        if (value === undefined) {
          // Try next token
          const token = context.tokens.peek();
          if (token && !token.isEscape) {
            value = token.toRaw();
            context.tokens.next();
          } else {
            // TODO: throw parse error
            throw new Error('');
          }
        }

        // Set option value
        if (this.option.type === 'required') {
          if (this.dirty) {
            // TODO: throw parse error, not support multiple required
            throw new Error('');
          }
          this.raw = value;
        } else {
          if (!this.raw) {
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
