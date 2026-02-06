import { describe, it, expect } from 'vitest';

import { TokenStream } from '../src/runtime/lexer.ts';

describe('token stream', () => {
  it('should list all arguments', () => {
    const lexer = new TokenStream(['a', 'b', 'c']);
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
    const lexer = new TokenStream(['a', 'b', 'c']);
    for (const token of lexer) {
      if (token.toRaw() === 'a') {
        // Skip 'b'
        expect(lexer.next()?.toRaw()).toMatchInlineSnapshot(`"a"`);
        expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"b"`);
      } else {
        expect(token.toRaw()).toMatchInlineSnapshot(`"c"`);
      }
    }
  });

  it('can get remaining args', () => {
    const lexer = new TokenStream(['a', 'b', 'c']);
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

  it('can move cursor backward', () => {
    const lexer = new TokenStream(['a', 'b']);
    expect(lexer.next()?.toRaw()).toMatchInlineSnapshot(`"a"`);
    lexer.prev();
    expect(lexer.next()?.toRaw()).toMatchInlineSnapshot(`"a"`);
    expect(lexer.next()?.toRaw()).toMatchInlineSnapshot(`"b"`);
  });

  it('can receive empty string', () => {
    const lexer = new TokenStream(['', 'a', '']);
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
    const lexer = new TokenStream(['abc', 'bc', 'c']);
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
    const lexer = new TokenStream([
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
    expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"-"`);
    expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`true`);
    expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

    // 123
    lexer.next();
    expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"123"`);
    expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "3",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "23",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`true`);
    expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

    // abc
    lexer.next();
    expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"abc"`);
    expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "c",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "bc",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

    // -f
    lexer.next();
    expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"-f"`);
    expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`true`);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "f",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
      [
        "f",
        undefined,
      ]
    `);
    expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

    // -fg
    lexer.next();
    expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"-fg"`);
    expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "g",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`true`);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "fg",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
      [
        "fg",
        undefined,
      ]
    `);
    expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

    // -n=1
    lexer.next();
    expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"-n=1"`);
    expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "",
        "1",
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`true`);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "n",
        "1",
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
      [
        "n",
        "1",
      ]
    `);
    expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

    // --flag
    lexer.next();
    expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"--flag"`);
    expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`true`);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "flag",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toMatchInlineSnapshot(`
      [
        "flag",
        undefined,
      ]
    `);
    expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "-flag",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

    // --value=def
    lexer.next();
    expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"--value=def"`);
    expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`true`);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "value",
        "def",
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toMatchInlineSnapshot(`
      [
        "value",
        "def",
      ]
    `);
    expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "-value",
        "def",
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

    // -1
    lexer.next();
    expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"-1"`);
    expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`true`);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "1",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
      [
        "1",
        undefined,
      ]
    `);
    expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`true`);
    expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`true`);

    // --1
    lexer.next();
    expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"--1"`);
    expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`true`);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "1",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toMatchInlineSnapshot(`
      [
        "1",
        undefined,
      ]
    `);
    expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "-1",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

    // --
    lexer.next();
    expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"--"`);
    expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`true`);
    expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "-",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

    // abc
    lexer.next();
    expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"abc"`);
    expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
      [
        "c",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToLong()).toBeUndefined();
    expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
      [
        "bc",
        undefined,
      ]
    `);
    expect(lexer.peek()?.checkToShort()).toBeUndefined();
    expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
    expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

    // End
    lexer.next();
    expect(lexer.next()).toBeUndefined();
    expect(lexer.isEnd).toMatchInlineSnapshot(`true`);
  });

  it('can reset parser state', () => {
    const lexer = new TokenStream([
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
      expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"-"`);
      expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`true`);
      expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
        [
          "",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
        [
          "",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

      // 123
      lexer.next();
      expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"123"`);
      expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
        [
          "3",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
        [
          "23",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`true`);
      expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

      // abc
      lexer.next();
      expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"abc"`);
      expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
        [
          "c",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
        [
          "bc",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

      // -f
      lexer.next();
      expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"-f"`);
      expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
        [
          "",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`true`);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
        [
          "f",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
        [
          "f",
          undefined,
        ]
      `);
      expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

      // -fg
      lexer.next();
      expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"-fg"`);
      expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
        [
          "g",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`true`);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
        [
          "fg",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
        [
          "fg",
          undefined,
        ]
      `);
      expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

      // -n=1
      lexer.next();
      expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"-n=1"`);
      expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
        [
          "",
          "1",
        ]
      `);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`true`);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
        [
          "n",
          "1",
        ]
      `);
      expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
        [
          "n",
          "1",
        ]
      `);
      expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

      // --flag
      lexer.next();
      expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"--flag"`);
      expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`true`);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
        [
          "flag",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToLong()).toMatchInlineSnapshot(`
        [
          "flag",
          undefined,
        ]
      `);
      expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
        [
          "-flag",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

      // --value=def
      lexer.next();
      expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"--value=def"`);
      expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`true`);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
        [
          "value",
          "def",
        ]
      `);
      expect(lexer.peek()?.checkToLong()).toMatchInlineSnapshot(`
        [
          "value",
          "def",
        ]
      `);
      expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
        [
          "-value",
          "def",
        ]
      `);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

      // -1
      lexer.next();
      expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"-1"`);
      expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
        [
          "",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`true`);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
        [
          "1",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToShort()).toMatchInlineSnapshot(`
        [
          "1",
          undefined,
        ]
      `);
      expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`true`);
      expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`true`);

      // --1
      lexer.next();
      expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"--1"`);
      expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`true`);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
        [
          "1",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToLong()).toMatchInlineSnapshot(`
        [
          "1",
          undefined,
        ]
      `);
      expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
        [
          "-1",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

      // --
      lexer.next();
      expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"--"`);
      expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`true`);
      expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
        [
          "",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
        [
          "-",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

      // abc
      lexer.next();
      expect(lexer.peek()?.toRaw()).toMatchInlineSnapshot(`"abc"`);
      expect(lexer.peek()?.isStdio).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEscape).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isEmpty).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isLong).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toLong()).toMatchInlineSnapshot(`
        [
          "c",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToLong()).toBeUndefined();
      expect(lexer.peek()?.isShort).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.toShort()).toMatchInlineSnapshot(`
        [
          "bc",
          undefined,
        ]
      `);
      expect(lexer.peek()?.checkToShort()).toBeUndefined();
      expect(lexer.peek()?.isNumber).toMatchInlineSnapshot(`false`);
      expect(lexer.peek()?.isNegativeNumber).toMatchInlineSnapshot(`false`);

      // End
      lexer.next();
      expect(lexer.next()).toBeUndefined();
      expect(lexer.isEnd).toMatchInlineSnapshot(`true`);
    }

    // End
    lexer.next();
    expect(lexer.next()).toBeUndefined();
    expect(lexer.isEnd).toMatchInlineSnapshot(`true`);
  });
});
