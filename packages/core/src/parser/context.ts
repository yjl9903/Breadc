import type { ICommand, IOption } from '../breadc/types.ts';

import type { MatchedArgument, MatchedOption } from './matched.ts';

import { Lexer, Token } from './lexer.ts';

export interface Container {
  globalOptions: IOption[];

  commands: ICommand[];
}

export interface ContextMetadata { }

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
  public arguments: MatchedArgument[] = [];

  /**
   * Matched options
   */
  public options: Map<string, MatchedOption> = new Map();

  /**
   * Remaining arguments
   */
  public remaining: Token[] = [];

  /**
   * Pending commands and options which are used internal
   */
  public matching: {
    /**
     * Arguments
     */
    readonly arguments: Token[];
    /**
     * Matching commands or command aliases
    */
    readonly commands: Map<string, [ICommand, number | undefined][]>;
    /**
     * Pending options
     */
    readonly options: Map<string, IOption>;
    /**
     * Unknown options
     */
    readonly unknownOptions: Array<[string, string | undefined]>;
  } = {
      commands: new Map(),
      arguments: [],
      options: new Map(),
      unknownOptions: [],
    };

  public constructor(container: Container, args: string[]) {
    this.container = container;
    this.tokens = new Lexer(args);
  }

  public reset() {
    this.tokens.reset();
    this.options = new Map();
    this.remaining = [];
    this.matching = {
      commands: new Map(),
      arguments: [],
      options: new Map(),
      unknownOptions: [],
    };
  }
}
