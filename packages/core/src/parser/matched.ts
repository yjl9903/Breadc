import type { IOption } from '../breadc/types';
import type { IArgument } from '../breadc/types';

import type { Token } from './lexer.ts';
import type { Context } from './context.ts';

export class MatchedArgument {
  public readonly argument: IArgument;

  public readonly token: Token | undefined;

  public value: any;

  public constructor(argument: IArgument) {
    this.argument = argument;
  }

  public accept(_context: Context, text: string | string[] | undefined) {
    // TODO
    return this;
  }
}

export class MatchedOption {
  public static FALSE_OPTION = ['false', 'no', 'off'];

  public readonly option: IOption;

  // TODO: default value, cast value

  public dirty = false;

  public raw: any;

  public constructor(option: IOption) {
    this.option = option;
  }

  public get value() {
    if (this.dirty) {
      return this.raw;
    } else {
      switch (this.option.type) {
        case 'boolean':
        case 'optional':
          return false;
        case 'required':
          return undefined;
        case 'array':
          return [];
      }
    }
  }

  public accept(context: Context, text: string | undefined) {
    switch (this.option.type) {
      case 'boolean': {
        // TODO: support --no-* options
        if (text !== undefined) {
          const value = text.toLowerCase();
          this.raw = MatchedOption.FALSE_OPTION.includes(value) ? false : true;
        } else {
          this.raw = true;
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
