import type { ICommand, IOption } from '../breadc/types.ts';

import { Lexer, Token } from './lexer.ts';

export interface Container {
  globalOptions: IOption[];

  commands: ICommand[];
}

export interface ContextMetadata {}

export class Context {
  /**
   * Metadata for user custom extension
   */
  public readonly metadata: ContextMetadata = {};

  /**
   * The metadata, options, commands registed from the Breadc app instance
   */
  public readonly container: Container;

  /**
   * Token stream
   */
  public readonly tokens: Lexer;

  /**
   * Matched command
   */
  public command: ICommand | undefined = undefined;

  /**
   * Matched arguments
   */
  public readonly arguments: MatchedArgument[] = [];

  /**
   * Matched options
   */
  public readonly options: Map<IOption, MatchedOption> = new Map();

  /**
   * Remaining arguments
   */
  public readonly remaining: Token[] = [];

  /**
   * Pending commands and options which are used internal
   */
  public readonly matching: {
    /**
     * Spread arguments
     */
    unknown: Token[];
    /**
     * Matching commands or command aliases
     */
    commands: Map<string, [ICommand, number | undefined][]>;
    /**
     * Pending options
     */
    options: Map<string, IOption>;
  } = {
    unknown: [],
    commands: new Map(),
    options: new Map()
  };

  public constructor(container: Container, args: string[]) {
    this.container = container;
    this.tokens = new Lexer(args);
  }
}

export class MatchedArgument {
  public value: any;

  public constructor(token: Token) {
    // Parse value
    const raw = token.toRaw();
    this.value = raw;
  }

  public accept(value: string) {
    // TODO
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
  }
}
