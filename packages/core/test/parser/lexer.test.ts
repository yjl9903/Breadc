import { describe, it, expect } from 'vitest';

import { Lexer } from '../../src/parser/lexer.ts';

describe('lexer', () => {
  it('should list all arguments', () => {
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

  it('support mixed using for and next', () => {
    const lexer = new Lexer(['a', 'b', 'c']);
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

  it('can get remaining args', () => {
    const lexer = new Lexer(['a', 'b', 'c']);
    expect(lexer.next()).toMatchInlineSnapshot(`
      Token {
        "text": "a",
      }
    `);
    expect(lexer.remaining()).toMatchInlineSnapshot(`
      [
        Token {
          "text": "b",
        },
        Token {
          "text": "c",
        },
      ]
    `);
    expect(lexer.peek()).toMatchInlineSnapshot(`undefined`);
    expect(lexer.isEnd).toBeTruthy();
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

  it('should treat token as string', () => {
    const lexer = new Lexer(['abc', 'bc', 'c']);
    const token = lexer.next()!;
    expect(token.length).toMatchInlineSnapshot(`3`);
    expect(token.toString()).toMatchInlineSnapshot(`"abc"`);
    expect([...token]).toMatchInlineSnapshot(`
      [
        "a",
        "b",
        "c",
      ]
    `);
  });

  it('can parse arg type', () => {
    const lexer = new Lexer([
      '-',
      '123',
      'abc',
      '-f',
      '-fg',
      '-n=1',
      '--flag',
      '--value=def',
      '-1',
      '--1',
      '--',
      'abc'
    ]);

    // -
    expect(lexer.peek()?.toRaw()).toBe('-');
    expect(lexer.peek()?.isStdio).toBe(true);
    expect(lexer.peek()?.isEscape).toBe(false);
    expect(lexer.peek()?.isEmpty).toBe(false);
    expect(lexer.peek()?.isLong).toBe(false);
    expect(lexer.peek()?.toLong()).toStrictEqual(['-', undefined]);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toBe(false);
    expect(lexer.peek()?.toShort()).toStrictEqual(['-', undefined]);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toBe(false);
    expect(lexer.peek()?.isNegativeNumber).toBe(false);

    // 123
    lexer.next();
    expect(lexer.peek()?.toRaw()).toBe('123');
    expect(lexer.peek()?.isStdio).toBe(false);
    expect(lexer.peek()?.isEscape).toBe(false);
    expect(lexer.peek()?.isEmpty).toBe(false);
    expect(lexer.peek()?.isLong).toBe(false);
    expect(lexer.peek()?.toLong()).toStrictEqual(['123', undefined]);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toBe(false);
    expect(lexer.peek()?.toShort()).toStrictEqual(['123', undefined]);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toBe(true);
    expect(lexer.peek()?.isNegativeNumber).toBe(false);

    // abc
    lexer.next();
    expect(lexer.peek()?.toRaw()).toBe('abc');
    expect(lexer.peek()?.isStdio).toBe(false);
    expect(lexer.peek()?.isEscape).toBe(false);
    expect(lexer.peek()?.isEmpty).toBe(false);
    expect(lexer.peek()?.isLong).toBe(false);
    expect(lexer.peek()?.toLong()).toStrictEqual(['abc', undefined]);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toBe(false);
    expect(lexer.peek()?.toShort()).toStrictEqual(['abc', undefined]);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toBe(false);
    expect(lexer.peek()?.isNegativeNumber).toBe(false);

    // -f
    lexer.next();
    expect(lexer.peek()?.toRaw()).toBe('-f');
    expect(lexer.peek()?.isStdio).toBe(false);
    expect(lexer.peek()?.isEscape).toBe(false);
    expect(lexer.peek()?.isEmpty).toBe(false);
    expect(lexer.peek()?.isLong).toBe(false);
    expect(lexer.peek()?.toLong()).toStrictEqual(['-f', undefined]);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toBe(true);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "-f",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
      [
        "-f",
        undefined,
      ]
    `);
    expect(lexer.peek()?.isNumber).toBe(false);
    expect(lexer.peek()?.isNegativeNumber).toBe(false);

    // -fg
    lexer.next();
    expect(lexer.peek()?.toRaw()).toBe('-fg');
    expect(lexer.peek()?.isStdio).toBe(false);
    expect(lexer.peek()?.isEscape).toBe(false);
    expect(lexer.peek()?.isEmpty).toBe(false);
    expect(lexer.peek()?.isLong).toBe(false);
    expect(lexer.peek()?.toLong()).toStrictEqual(['-fg', undefined]);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toBe(true);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "-fg",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
      [
        "-fg",
        undefined,
      ]
    `);
    expect(lexer.peek()?.isNumber).toBe(false);
    expect(lexer.peek()?.isNegativeNumber).toBe(false);

    // -n=1
    lexer.next();
    expect(lexer.peek()?.toRaw()).toBe('-n=1');
    expect(lexer.peek()?.isStdio).toBe(false);
    expect(lexer.peek()?.isEscape).toBe(false);
    expect(lexer.peek()?.isEmpty).toBe(false);
    expect(lexer.peek()?.isLong).toBe(false);
    expect(lexer.peek()?.toLong()).toStrictEqual(['-n', '1']);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toBe(true);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "-n",
        "1",
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
      [
        "-n",
        "1",
      ]
    `);
    expect(lexer.peek()?.isNumber).toBe(false);
    expect(lexer.peek()?.isNegativeNumber).toBe(false);

    // --flag
    lexer.next();
    expect(lexer.peek()?.toRaw()).toBe('--flag');
    expect(lexer.peek()?.isStdio).toBe(false);
    expect(lexer.peek()?.isEscape).toBe(false);
    expect(lexer.peek()?.isEmpty).toBe(false);
    expect(lexer.peek()?.isLong).toBe(true);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "--flag",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toMatchInlineSnapshot(`
      [
        "--flag",
        undefined,
      ]
    `);
    expect(lexer.peek()?.isShort).toBe(false);
    expect(lexer.peek()?.toShort()).toStrictEqual(['--flag', undefined]);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toBe(false);
    expect(lexer.peek()?.isNegativeNumber).toBe(false);

    // --value=def
    lexer.next();
    expect(lexer.peek()?.toRaw()).toBe('--value=def');
    expect(lexer.peek()?.isStdio).toBe(false);
    expect(lexer.peek()?.isEscape).toBe(false);
    expect(lexer.peek()?.isEmpty).toBe(false);
    expect(lexer.peek()?.isLong).toBe(true);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "--value",
        "def",
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toMatchInlineSnapshot(`
      [
        "--value",
        "def",
      ]
    `);
    expect(lexer.peek()?.isShort).toBe(false);
    expect(lexer.peek()?.toShort()).toStrictEqual(['--value', 'def']);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toBe(false);
    expect(lexer.peek()?.isNegativeNumber).toBe(false);

    // -1
    lexer.next();
    expect(lexer.peek()?.toRaw()).toBe('-1');
    expect(lexer.peek()?.isStdio).toBe(false);
    expect(lexer.peek()?.isEscape).toBe(false);
    expect(lexer.peek()?.isEmpty).toBe(false);
    expect(lexer.peek()?.isLong).toBe(false);
    expect(lexer.peek()?.toLong()).toStrictEqual(['-1', undefined]);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toBe(true);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "-1",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
      [
        "-1",
        undefined,
      ]
    `);
    expect(lexer.peek()?.isNumber).toBe(true);
    expect(lexer.peek()?.isNegativeNumber).toBe(true);

    // --1
    lexer.next();
    expect(lexer.peek()?.toRaw()).toBe('--1');
    expect(lexer.peek()?.isStdio).toBe(false);
    expect(lexer.peek()?.isEscape).toBe(false);
    expect(lexer.peek()?.isEmpty).toBe(false);
    expect(lexer.peek()?.isLong).toBe(true);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "--1",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toMatchInlineSnapshot(`
      [
        "--1",
        undefined,
      ]
    `);
    expect(lexer.peek()?.isShort).toBe(false);
    expect(lexer.peek()?.toShort()).toStrictEqual(['--1', undefined]);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toBe(false);
    expect(lexer.peek()?.isNegativeNumber).toBe(false);

    // --
    lexer.next();
    expect(lexer.peek()?.toRaw()).toBe('--');
    expect(lexer.peek()?.isStdio).toBe(false);
    expect(lexer.peek()?.isEscape).toBe(true);
    expect(lexer.peek()?.isEmpty).toBe(false);
    expect(lexer.peek()?.isLong).toBe(false);
    expect(lexer.peek()?.toLong()).toStrictEqual(['--', undefined]);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toBe(false);
    expect(lexer.peek()?.toShort()).toStrictEqual(['--', undefined]);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toBe(false);
    expect(lexer.peek()?.isNegativeNumber).toBe(false);

    // abc
    lexer.next();
    expect(lexer.peek()?.toRaw()).toBe('abc');
    expect(lexer.peek()?.isStdio).toBe(false);
    expect(lexer.peek()?.isEscape).toBe(false);
    expect(lexer.peek()?.isEmpty).toBe(false);
    expect(lexer.peek()?.isLong).toBe(false);
    expect(lexer.peek()?.toLong()).toStrictEqual(['abc', undefined]);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toBe(false);
    expect(lexer.peek()?.toShort()).toStrictEqual(['abc', undefined]);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toBe(false);
    expect(lexer.peek()?.isNegativeNumber).toBe(false);

    // End
    lexer.next();
    expect(lexer.next()).toBeUndefined();
    expect(lexer.isEnd).toBe(true);
  });

  it('can reset parser state', () => {
    const lexer = new Lexer([
      '-',
      '123',
      'abc',
      '-f',
      '-fg',
      '-n=1',
      '--flag',
      '--value=def',
      '-1',
      '--1',
      '--',
      'abc'
    ]);

    for (let i = 0; i < 2; i++) {
      lexer.reset();

      // -
      expect(lexer.peek()?.toRaw()).toBe('-');
      expect(lexer.peek()?.isStdio).toBe(true);
      expect(lexer.peek()?.isEscape).toBe(false);
      expect(lexer.peek()?.isEmpty).toBe(false);
      expect(lexer.peek()?.isLong).toBe(false);
      expect(lexer.peek()?.toLong()).toStrictEqual(['-', undefined]);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toBe(false);
      expect(lexer.peek()?.toShort()).toStrictEqual(['-', undefined]);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toBe(false);
      expect(lexer.peek()?.isNegativeNumber).toBe(false);

      // 123
      lexer.next();
      expect(lexer.peek()?.toRaw()).toBe('123');
      expect(lexer.peek()?.isStdio).toBe(false);
      expect(lexer.peek()?.isEscape).toBe(false);
      expect(lexer.peek()?.isEmpty).toBe(false);
      expect(lexer.peek()?.isLong).toBe(false);
      expect(lexer.peek()?.toLong()).toStrictEqual(['123', undefined]);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toBe(false);
      expect(lexer.peek()?.toShort()).toStrictEqual(['123', undefined]);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toBe(true);
      expect(lexer.peek()?.isNegativeNumber).toBe(false);

      // abc
      lexer.next();
      expect(lexer.peek()?.toRaw()).toBe('abc');
      expect(lexer.peek()?.isStdio).toBe(false);
      expect(lexer.peek()?.isEscape).toBe(false);
      expect(lexer.peek()?.isEmpty).toBe(false);
      expect(lexer.peek()?.isLong).toBe(false);
      expect(lexer.peek()?.toLong()).toStrictEqual(['abc', undefined]);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toBe(false);
      expect(lexer.peek()?.toShort()).toStrictEqual(['abc', undefined]);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toBe(false);
      expect(lexer.peek()?.isNegativeNumber).toBe(false);

      // -f
      lexer.next();
      expect(lexer.peek()?.toRaw()).toBe('-f');
      expect(lexer.peek()?.isStdio).toBe(false);
      expect(lexer.peek()?.isEscape).toBe(false);
      expect(lexer.peek()?.isEmpty).toBe(false);
      expect(lexer.peek()?.isLong).toBe(false);
      expect(lexer.peek()?.toLong()).toStrictEqual(['-f', undefined]);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toBe(true);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "-f",
        undefined,
      ]
    `);
      expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
      [
        "-f",
        undefined,
      ]
    `);
      expect(lexer.peek()?.isNumber).toBe(false);
      expect(lexer.peek()?.isNegativeNumber).toBe(false);

      // -fg
      lexer.next();
      expect(lexer.peek()?.toRaw()).toBe('-fg');
      expect(lexer.peek()?.isStdio).toBe(false);
      expect(lexer.peek()?.isEscape).toBe(false);
      expect(lexer.peek()?.isEmpty).toBe(false);
      expect(lexer.peek()?.isLong).toBe(false);
      expect(lexer.peek()?.toLong()).toStrictEqual(['-fg', undefined]);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toBe(true);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "-fg",
        undefined,
      ]
    `);
      expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
      [
        "-fg",
        undefined,
      ]
    `);
      expect(lexer.peek()?.isNumber).toBe(false);
      expect(lexer.peek()?.isNegativeNumber).toBe(false);

      // -n=1
      lexer.next();
      expect(lexer.peek()?.toRaw()).toBe('-n=1');
      expect(lexer.peek()?.isStdio).toBe(false);
      expect(lexer.peek()?.isEscape).toBe(false);
      expect(lexer.peek()?.isEmpty).toBe(false);
      expect(lexer.peek()?.isLong).toBe(false);
      expect(lexer.peek()?.toLong()).toStrictEqual(['-n', '1']);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toBe(true);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "-n",
        "1",
      ]
    `);
      expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
      [
        "-n",
        "1",
      ]
    `);
      expect(lexer.peek()?.isNumber).toBe(false);
      expect(lexer.peek()?.isNegativeNumber).toBe(false);

      // --flag
      lexer.next();
      expect(lexer.peek()?.toRaw()).toBe('--flag');
      expect(lexer.peek()?.isStdio).toBe(false);
      expect(lexer.peek()?.isEscape).toBe(false);
      expect(lexer.peek()?.isEmpty).toBe(false);
      expect(lexer.peek()?.isLong).toBe(true);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "--flag",
        undefined,
      ]
    `);
      expect(lexer.peek()?.checkToLong()).toMatchInlineSnapshot(`
      [
        "--flag",
        undefined,
      ]
    `);
      expect(lexer.peek()?.isShort).toBe(false);
      expect(lexer.peek()?.toShort()).toStrictEqual(['--flag', undefined]);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toBe(false);
      expect(lexer.peek()?.isNegativeNumber).toBe(false);

      // --value=def
      lexer.next();
      expect(lexer.peek()?.toRaw()).toBe('--value=def');
      expect(lexer.peek()?.isStdio).toBe(false);
      expect(lexer.peek()?.isEscape).toBe(false);
      expect(lexer.peek()?.isEmpty).toBe(false);
      expect(lexer.peek()?.isLong).toBe(true);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "--value",
        "def",
      ]
    `);
      expect(lexer.peek()?.checkToLong()).toMatchInlineSnapshot(`
      [
        "--value",
        "def",
      ]
    `);
      expect(lexer.peek()?.isShort).toBe(false);
      expect(lexer.peek()?.toShort()).toStrictEqual(['--value', 'def']);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toBe(false);
      expect(lexer.peek()?.isNegativeNumber).toBe(false);

      // -1
      lexer.next();
      expect(lexer.peek()?.toRaw()).toBe('-1');
      expect(lexer.peek()?.isStdio).toBe(false);
      expect(lexer.peek()?.isEscape).toBe(false);
      expect(lexer.peek()?.isEmpty).toBe(false);
      expect(lexer.peek()?.isLong).toBe(false);
      expect(lexer.peek()?.toLong()).toStrictEqual(['-1', undefined]);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toBe(true);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "-1",
        undefined,
      ]
    `);
      expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
      [
        "-1",
        undefined,
      ]
    `);
      expect(lexer.peek()?.isNumber).toBe(true);
      expect(lexer.peek()?.isNegativeNumber).toBe(true);

      // --1
      lexer.next();
      expect(lexer.peek()?.toRaw()).toBe('--1');
      expect(lexer.peek()?.isStdio).toBe(false);
      expect(lexer.peek()?.isEscape).toBe(false);
      expect(lexer.peek()?.isEmpty).toBe(false);
      expect(lexer.peek()?.isLong).toBe(true);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "--1",
        undefined,
      ]
    `);
      expect(lexer.peek()?.checkToLong()).toMatchInlineSnapshot(`
      [
        "--1",
        undefined,
      ]
    `);
      expect(lexer.peek()?.isShort).toBe(false);
      expect(lexer.peek()?.toShort()).toStrictEqual(['--1', undefined]);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toBe(false);
      expect(lexer.peek()?.isNegativeNumber).toBe(false);

      // --
      lexer.next();
      expect(lexer.peek()?.toRaw()).toBe('--');
      expect(lexer.peek()?.isStdio).toBe(false);
      expect(lexer.peek()?.isEscape).toBe(true);
      expect(lexer.peek()?.isEmpty).toBe(false);
      expect(lexer.peek()?.isLong).toBe(false);
      expect(lexer.peek()?.toLong()).toStrictEqual(['--', undefined]);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toBe(false);
      expect(lexer.peek()?.toShort()).toStrictEqual(['--', undefined]);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toBe(false);
      expect(lexer.peek()?.isNegativeNumber).toBe(false);

      // abc
      lexer.next();
      expect(lexer.peek()?.toRaw()).toBe('abc');
      expect(lexer.peek()?.isStdio).toBe(false);
      expect(lexer.peek()?.isEscape).toBe(false);
      expect(lexer.peek()?.isEmpty).toBe(false);
      expect(lexer.peek()?.isLong).toBe(false);
      expect(lexer.peek()?.toLong()).toStrictEqual(['abc', undefined]);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toBe(false);
      expect(lexer.peek()?.toShort()).toStrictEqual(['abc', undefined]);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toBe(false);
      expect(lexer.peek()?.isNegativeNumber).toBe(false);

      // End
      lexer.next();
      expect(lexer.next()).toBeUndefined();
      expect(lexer.isEnd).toBe(true);
    }

    // End
    lexer.next();
    expect(lexer.next()).toBeUndefined();
    expect(lexer.isEnd).toBe(true);
  });
});
