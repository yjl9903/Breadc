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

    expect(lexer.peek()!.type()).toBe('--');
    expect(lexer.hasNext()).toBeTruthy();
    const t1 = lexer.next()!;
    expect(t1.type()).toBe('--');

    expect(lexer.peek()!.type()).toBe('-');
    expect(lexer.hasNext()).toBeTruthy();
    const t2 = lexer.next()!;
    expect(t2.type()).toBe('-');

    expect(lexer.peek()!.number()).toBe(123);
    expect(lexer.hasNext()).toBeTruthy();
    const t3 = lexer.next()!;
    expect(t3.type()).toBe('number');
    expect(t3.number()).toBe(123);

    expect(lexer.peek()!.number()).toBe(-1);
    expect(lexer.hasNext()).toBeTruthy();
    const t4 = lexer.next()!;
    expect(t4.type()).toBe('number');
    expect(t4.number()).toBe(-1);

    expect(lexer.peek()!.option()).toBe('flag');
    expect(lexer.hasNext()).toBeTruthy();
    const t5 = lexer.next()!;
    expect(t5.type()).toBe('long');
    expect(t5.option()).toBe('flag');

    expect(lexer.peek()!.option()).toBe('f');
    expect(lexer.hasNext()).toBeTruthy();
    const t6 = lexer.next()!;
    expect(t6.type()).toBe('short');
    expect(t6.option()).toBe('f');

    expect(lexer.peek()!.type()).toBe('string');
    expect(lexer.hasNext()).toBeTruthy();
    const t7 = lexer.next()!;
    expect(t7.type()).toBe('string');

    expect(lexer.peek()).toBeUndefined();
    expect(lexer.hasNext()).toBeFalsy();
    const t8 = lexer.next();
    expect(t8).toBeUndefined();
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
