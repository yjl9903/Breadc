import type { Option } from '../breadc/index.ts';
import type { InternalOption, InternalArgument, OptionType } from '../breadc/types/internal.ts';

import type { Token } from './lexer.ts';
import type { Context } from './context.ts';

export class MatchedArgument {
  public readonly argument: InternalArgument;

  public readonly token: Token | undefined;

  public dirty = false;

  public raw: string | string[] | undefined;

  public constructor(argument: InternalArgument) {
    this.argument = argument;
    if (argument.init?.initial !== undefined) {
      this.raw = argument.init.initial;
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

  public value<T = any>(): T {
    if (this.dirty || this.argument.init?.default === undefined) {
      const cast = this.argument.init?.cast;
      return cast ? (cast(this.raw) as T) : (this.raw as T);
    } else {
      return this.argument.init.default as T;
    }
  }

  public accept(_context: Context, value: string | string[] | undefined) {
    this.dirty = true;
    this.raw = value;
    return this;
  }
}

const FALSE_OPTION = ['false', 'f', 'no', 'n', 'off'];

export class MatchedOption {
  public readonly option: InternalOption;

  public dirty = false;

  public raw: any;

  public constructor(option: Option | InternalOption) {
    this.option = option as InternalOption;
    if (option.init.initial !== undefined) {
      this.raw = option.init.initial;
    } else {
      switch ((option as InternalOption).type) {
        case 'boolean':
        case 'optional':
          this.raw = false;
          break;
        case 'required':
          this.raw = undefined;
          break;
        case 'spread':
          this.raw = [];
          break;
      }
    }
  }

  public value<T = any>(): T {
    if (this.dirty || this.option.init.default === undefined) {
      const cast = this.option.init.cast;
      return cast ? (cast(this.raw) as T) : this.raw;
    } else {
      return this.option.init.default as T;
    }
  }

  public accept(context: Context, long: string, text: string | undefined) {
    switch (this.option.type) {
      case 'boolean': {
        if (text !== undefined) {
          const value = text.toLowerCase();
          if (!long.startsWith('--no-')) {
            this.raw = FALSE_OPTION.includes(value) ? false : true;
          } else {
            this.raw = FALSE_OPTION.includes(value) ? true : false;
          }
        } else {
          if (!long.startsWith('--no-')) {
            this.raw = true;
          } else {
            this.raw = false;
          }
        }

        this.dirty = true;

        break;
      }
      case 'optional': {
        // Handle optional options
        let value = text;
        if (value === undefined) {
          const token = context.tokens.peek();
          if (token && !token.isEscape && !token.isLong && (!token.isShort || token.isNegativeNumber)) {
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
      case 'spread': {
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
