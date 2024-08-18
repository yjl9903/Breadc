import type { ICommand, IOption } from '../breadc/types.ts';

import type { MatchedArgument, MatchedOption } from './matched.ts';

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
