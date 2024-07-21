import type { ICommand, IOption } from '../breadc/types.ts';

import { Lexer, Token } from './lexer.ts';

export interface Container {
  globalOptions: IOption[];

  commands: ICommand[];
}

export class Context {
  /**
   * The metadata, options, commands registed from the Breadc app instance
   */
  public readonly container: Container;

  public readonly lexer: Lexer;

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
    unknown: Token[];
    commands: Map<string, ICommand[]>;
    options: Map<string, IOption>;
  } = {
    unknown: [],
    commands: new Map(),
    options: new Map()
  };

  public constructor(container: Container, args: string[]) {
    this.container = container;
    this.lexer = new Lexer(args);
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
  public readonly option: IOption;

  public value: any;

  public constructor(option: IOption) {
    this.option = option;
  }

  public accept(context: Context, text: string | undefined) {
    switch (this.option.type) {
      case 'boolean':
        if (text !== undefined) {
          // TODO
        }
        this.value = true;
        break;
      case 'optional':
        // TODO
        break;
      case 'required':
      case 'array':
        // TODO
        break;
    }
  }
}
