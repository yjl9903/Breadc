import { describe, it, expect } from 'vitest';

import { Lexer } from '../src/parser/lexer.ts';
import { Parser } from '../src/parser/parser.ts';

describe('parser', () => {
  it('should create parser', () => {
    const lexer = new Lexer(['a', 'b', 'c']);
    const parser = new Parser(lexer);
  });
});
