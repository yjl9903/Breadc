import type { Option } from '../breadc/option.ts';
import type { Command } from '../breadc/command.ts';

import { Parser } from './parser.ts';
import { Lexer, Token } from './lexer.ts';

export interface Container {
  options: Option[];

  commands: Command[];
}

export class Context {
  public readonly container: Container;

  public readonly lexer: Lexer;

  public readonly parser: Parser;

  public command: Command | undefined = undefined;

  public readonly arguments: MatchedArgument[] = [];

  public readonly options: Map<Option, MatchedOption> = new Map();

  public readonly remaining: Token[] = [];

  public constructor(container: Container, args: string[]) {
    this.container = container;
    this.lexer = new Lexer(args);
    this.parser = new Parser(this.lexer);
  }
}

export class MatchedArgument {
  public value: any;

  public constructor(token: Token) {
    // Parse value
    const raw = token.toRaw();
    this.value = raw;
  }
}

export class MatchedOption {
  public readonly option: Option;

  public value: any;

  public constructor(option: Option) {
    this.option = option;
  }
}
