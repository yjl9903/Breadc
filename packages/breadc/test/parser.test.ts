import { describe, it, expect } from 'vitest';

import { Lexer, breadc } from '../src/parser';

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
});

describe('parser', () => {
  const DEFAULT_ACTION = (...args: any[]) => args;

  it('should add simple commands', async () => {
    const cli = breadc('cli');
    cli.command('ping').action(DEFAULT_ACTION);
    cli.command('hello <name>').action(DEFAULT_ACTION);
    cli.command('test [case]').action(DEFAULT_ACTION);
    cli.command('run [...cmd]').action(DEFAULT_ACTION);

    expect(await cli.run(['ping'])).toMatchInlineSnapshot(`
      [
        {
          "--": [],
        },
      ]
    `);
    expect(await cli.run(['hello', 'XLor'])).toMatchInlineSnapshot(`
      [
        "XLor",
        {
          "--": [],
        },
      ]
    `);
    expect(await cli.run(['test'])).toMatchInlineSnapshot(`
      [
        undefined,
        {
          "--": [],
        },
      ]
    `);
    expect(await cli.run(['test', 'aplusb'])).toMatchInlineSnapshot(`
      [
        "aplusb",
        {
          "--": [],
        },
      ]
    `);
    expect(await cli.run(['run', 'echo', '123'])).toMatchInlineSnapshot(`
      [
        [
          "echo",
          "123",
        ],
        {
          "--": [],
        },
      ]
    `);
  });

  it('should add sub-commands', async () => {
    const cli = breadc('cli');
    cli.command('dev').action(() => false);
    cli.command('dev host').action(() => true);
    cli.command('dev remote <addr>').action((addr) => addr);
    cli.command('dev test [root]').action((addr) => addr);

    expect(await cli.run(['dev'])).toBeFalsy();
    expect(await cli.run(['dev', 'host'])).toBeTruthy();
    expect(await cli.run(['dev', 'remote', '1.1.1.1'])).toBe('1.1.1.1');
    expect(await cli.run(['dev', 'test'])).toBe(undefined);
    expect(await cli.run(['dev', 'test', '2.2.2.2'])).toBe('2.2.2.2');
  });
});
