import type { BreadcLexer } from './lexer.ts';

export class BreadcParser {
  private readonly lexer: BreadcLexer;

  public constructor(lexer: BreadcLexer) {
    this.lexer = lexer;
  }
}
