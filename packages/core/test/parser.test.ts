import { describe, it, expect } from 'vitest';

import { BreadcLexer } from '../src/parser/lexer.ts';
import { BreadcParser } from '../src/parser/parser.ts';

describe('parser', () => {
  it('should create parser', () => {
    const lexer = new BreadcLexer(['a', 'b', 'c']);
    const parser = new BreadcParser(lexer);
  });
});
