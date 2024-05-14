import type { Option } from '../breadc/option.ts';
import type { Argument, Command } from '../breadc/command.ts';

import { Parser } from './parser.ts';
import { Lexer, Token } from './lexer.ts';

export class Context {
  public readonly lexer: Lexer;

  public readonly parser: Parser;

  public command: Command | undefined = undefined;

  public readonly arguments: MatchedArgument[] = [];

  public readonly options: Map<Option, MatchedOption> = new Map();

  public readonly remaining: Token[] = [];

  public constructor(args: string[]) {
    this.lexer = new Lexer(args);
    this.parser = new Parser(this.lexer);
  }
}

export class MatchedArgument {
  public readonly argument: Argument;

  public readonly token: Token;

  public value: any;

  public constructor(argument: Argument, token: Token) {
    this.argument = argument;
    this.token = token;
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
