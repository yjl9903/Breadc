import { describe, it, expect } from 'vitest';

import { BreadcLexer } from '../src/parser/lexer.ts';

describe('lexer', () => {
  it('should list all arguments', () => {
    const lexer = new BreadcLexer(['a', 'b', 'c']);
    expect([...lexer]).toMatchInlineSnapshot(`
      [
        Token {
          "text": "a",
        },
        Token {
          "text": "b",
        },
        Token {
          "text": "c",
        },
      ]
    `);
  });

  it('support mixed using for and next', () => {
    const lexer = new BreadcLexer(['a', 'b', 'c']);
    for (const token of lexer) {
      if (token.toRaw() === 'a') {
        // Skip 'b'
        expect(lexer.next()?.toRaw()).toBe('a');
        expect(lexer.peek()?.toRaw()).toBe('b');
      } else {
        expect(token.toRaw()).toBe('c');
      }
    }
  });

  it('can receive empty string', () => {
    const lexer = new BreadcLexer(['', 'a', '']);
    expect([...lexer]).toMatchInlineSnapshot(`
      [
        Token {
          "text": "",
        },
        Token {
          "text": "a",
        },
        Token {
          "text": "",
        },
      ]
    `);
  });
});
