import type { Lexer } from './lexer.ts';

export class Parser {
  private readonly lexer: Lexer;

  public constructor(lexer: Lexer) {
    this.lexer = lexer;
  }
}
