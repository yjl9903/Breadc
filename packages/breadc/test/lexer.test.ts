import { describe, it, expect } from 'vitest';

import { Lexer } from '../src/parser';

describe('lexer', () => {
  it('should list all', () => {
    const lexer = new Lexer(['a', 'b', 'c']);
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

  it('can use for and next', () => {
    const lexer = new Lexer(['a', 'b', 'c']);
    for (const token of lexer) {
      if (token.raw() === 'a') {
        expect(lexer.next()?.raw()).toBe('b');
      } else {
        expect(token.raw()).toBe('c');
        expect(lexer.peek()).toBe(undefined);
      }
    }
  });

  it('can parse arg type', () => {
    const lexer = new Lexer(['--', '-', '123', '-1', '--flag', '-f', 'abc']);

    const t1 = lexer.next()!;
    expect(t1.type()).toBe('--');

    const t2 = lexer.next()!;
    expect(t2.type()).toBe('-');

    const t3 = lexer.next()!;
    expect(t3.type()).toBe('number');
    expect(t3.number()).toBe(123);

    const t4 = lexer.next()!;
    expect(t4.type()).toBe('number');
    expect(t4.number()).toBe(-1);

    const t5 = lexer.next()!;
    expect(t5.type()).toBe('long');
    expect(t5.option()).toBe('flag');

    const t6 = lexer.next()!;
    expect(t6.type()).toBe('short');
    expect(t6.option()).toBe('f');

    const t7 = lexer.next()!;
    expect(t7.type()).toBe('string');

    const t8 = lexer.next();
    expect(t8).toBe(undefined);
  });

  it('can receive empty string', () => {
    const lexer = new Lexer(['', 'a', '']);
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
