import { describe, it, expect } from 'vitest';

import { breadc } from '../src';

const DEFAULT_ACTION = (...args: any[]) => args;

describe('Basic Parser', () => {
  it('should parse rest arguments', () => {
    expect(breadc('cli').parse(['hello', 'world'])).toMatchInlineSnapshot(`
      {
        "--": [
          "hello",
          "world",
        ],
        "arguments": [],
        "callback": undefined,
        "matched": {
          "command": undefined,
          "node": {
            "children": Map {},
            "finish": [Function],
            "init": [Function],
            "next": [Function],
          },
          "option": undefined,
        },
        "meta": {},
        "options": {},
      }
    `);
  });

  it('should receive rest arguments', async () => {
    const cli = breadc('cli');

    cli.command('').action((option) => option['--']);
    cli.command('echo [msg]').action((msg, option) => [msg, option['--']]);

    expect(await cli.run(['a', 'b', 'c'])).toMatchInlineSnapshot(`
      [
        "a",
        "b",
        "c",
      ]
    `);

    expect(await cli.run(['echo', 'hello', 'world'])).toMatchInlineSnapshot(`
      [
        "hello",
        [
          "world",
        ],
      ]
    `);

    expect(await cli.run(['echo', '--', 'hello', 'world']))
      .toMatchInlineSnapshot(`
      [
        undefined,
        [
          "hello",
          "world",
        ],
      ]
    `);

    expect(await cli.run(['--', 'echo', 'hello', 'world']))
      .toMatchInlineSnapshot(`
      [
        "echo",
        "hello",
        "world",
      ]
    `);
  });

  // it('should parse boolean option', () => {
  //   expect(breadc('cli').parse(['--root'])).toMatchInlineSnapshot(`
  //     {
  //       "--": [],
  //       "arguments": [],
  //       "command": undefined,
  //       "options": {},
  //     }
  //   `);
  //   expect(breadc('cli').parse(['--root', 'folder'])).toMatchInlineSnapshot(`
  //     {
  //       "--": [],
  //       "arguments": [],
  //       "command": undefined,
  //       "options": {},
  //     }
  //   `);
  //   expect(breadc('cli').parse(['--root', 'folder', 'text']))
  //     .toMatchInlineSnapshot(`
  //     {
  //       "--": [],
  //       "arguments": [
  //         "text",
  //       ],
  //       "command": undefined,
  //       "options": {},
  //     }
  //   `);
  //   expect(breadc('cli').option('--root').parse(['--root', 'folder', 'text']))
  //     .toMatchInlineSnapshot(`
  //     {
  //       "--": [],
  //       "arguments": [
  //         "folder",
  //         "text",
  //       ],
  //       "command": undefined,
  //       "options": {
  //         "root": true,
  //       },
  //     }
  //   `);
  //   expect(breadc('cli').option('--root').parse(['folder', '--root', 'text']))
  //     .toMatchInlineSnapshot(`
  //     {
  //       "--": [],
  //       "arguments": [
  //         "folder",
  //         "text",
  //       ],
  //       "command": undefined,
  //       "options": {
  //         "root": true,
  //       },
  //     }
  //   `);
  //   expect(breadc('cli').option('--root').parse(['folder', 'text', '--root']))
  //     .toMatchInlineSnapshot(`
  //     {
  //       "--": [],
  //       "arguments": [
  //         "folder",
  //         "text",
  //       ],
  //       "command": undefined,
  //       "options": {
  //         "root": true,
  //       },
  //     }
  //   `);
  // });
  // it('should not parse wrong option', () => {
  //   Breadc('cli').option('invalid');
  //   expect(output[0]).toMatchInlineSnapshot(
  //     '"Can not parse option format from \\"invalid\\""'
  //   );
  // });
});

describe('Command Parser', () => {
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

  it('should add order sub-commands', async () => {
    const cli = breadc('cli');
    cli.command('dev host').action(() => true);
    cli.command('dev remote <addr>').action((addr) => addr);
    cli.command('dev').action(() => false);
    cli.command('dev test [root]').action((addr) => addr);

    expect(await cli.run(['dev'])).toBeFalsy();
    expect(await cli.run(['dev', 'host'])).toBeTruthy();
    expect(await cli.run(['dev', 'remote', '1.1.1.1'])).toBe('1.1.1.1');
    expect(await cli.run(['dev', 'test'])).toBe(undefined);
    expect(await cli.run(['dev', 'test', '2.2.2.2'])).toBe('2.2.2.2');
  });

  it('should add default command', async () => {
    const cli = breadc('cli');
    cli.command('<message>').action((message) => message);
    cli.command('dev <root>').action((message) => message);
    cli.command('dev remote <addr>').action((addr) => addr);
    expect(await cli.run(['world'])).toBe('world');
    expect(await cli.run(['build'])).toBe('build');
    expect(await cli.run(['dev', 'world2'])).toBe('world2');
    expect(await cli.run(['dev', 'remote', '1.1.1.1'])).toBe('1.1.1.1');
  });

  it('should add default command with optional args', async () => {
    const cli = breadc('cli');
    cli.command('[message]').action((message) => message);
    expect(await cli.run([])).toBe(undefined);
    expect(await cli.run(['world'])).toBe('world');
  });

  it('should add default command with rest args', async () => {
    const cli = breadc('cli');
    cli.command('[...message]').action((message) => message);
    expect(await cli.run([])).toStrictEqual([]);
    expect(await cli.run(['world'])).toStrictEqual(['world']);
    expect(await cli.run(['hello', 'world'])).toStrictEqual(['hello', 'world']);
  });
});

describe('Option Parser', () => {
  it('should parse boolean option with shortcut', () => {
    const cli = breadc('cli').option('-r, --root');

    expect(cli.parse([])).toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [],
        "callback": undefined,
        "matched": {
          "command": undefined,
          "node": {
            "children": Map {},
            "finish": [Function],
            "init": [Function],
            "next": [Function],
          },
          "option": undefined,
        },
        "meta": {},
        "options": {
          "root": false,
        },
      }
    `);

    expect(cli.parse(['--root'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [],
        "callback": undefined,
        "matched": {
          "command": undefined,
          "node": {
            "children": Map {},
            "finish": [Function],
            "init": [Function],
            "next": [Function],
          },
          "option": undefined,
        },
        "meta": {},
        "options": {
          "root": true,
        },
      }
    `);

    expect(cli.parse(['-r'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [],
        "callback": undefined,
        "matched": {
          "command": undefined,
          "node": {
            "children": Map {},
            "finish": [Function],
            "init": [Function],
            "next": [Function],
          },
          "option": undefined,
        },
        "meta": {},
        "options": {
          "root": true,
        },
      }
    `);

    expect(cli.parse(['-r', 'root'])).toMatchInlineSnapshot(`
      {
        "--": [
          "root",
        ],
        "arguments": [],
        "callback": undefined,
        "matched": {
          "command": undefined,
          "node": {
            "children": Map {},
            "finish": [Function],
            "init": [Function],
            "next": [Function],
          },
          "option": undefined,
        },
        "meta": {},
        "options": {
          "root": true,
        },
      }
    `);

    expect(cli.parse(['root', '-r'])).toMatchInlineSnapshot(`
      {
        "--": [
          "root",
        ],
        "arguments": [],
        "callback": undefined,
        "matched": {
          "command": undefined,
          "node": {
            "children": Map {},
            "finish": [Function],
            "init": [Function],
            "next": [Function],
          },
          "option": undefined,
        },
        "meta": {},
        "options": {
          "root": true,
        },
      }
    `);
  });

  it('should parse option', async () => {
    const cli = breadc('cli');
    cli.option('--remote');
    cli.option('--host <host>');
    cli.command('').option('--flag').action(DEFAULT_ACTION);

    expect(await cli.run(['--remote'])).toMatchInlineSnapshot(`
      [
        {
          "--": [],
          "flag": false,
          "remote": true,
        },
      ]
    `);

    expect(await cli.run(['--flag'])).toMatchInlineSnapshot(`
      [
        {
          "--": [],
          "flag": true,
          "remote": false,
        },
      ]
    `);

    expect(await cli.run(['--host', '1.1.1.1'])).toMatchInlineSnapshot(`
      [
        {
          "--": [],
          "flag": false,
          "host": "1.1.1.1",
          "remote": false,
        },
      ]
    `);
  });

  it('should parse negtive option', async () => {
    const cli = breadc('cli');
    cli.option('--remote', { default: false });
    cli.option('--local', { default: true });
    cli.option('--run <path>', { default: './' });
    cli.command('').action((o) => o);

    expect(await cli.run([])).toMatchInlineSnapshot(`
      {
        "--": [],
        "local": true,
        "remote": false,
        "run": "./",
      }
    `);

    expect(await cli.run(['--local'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "local": true,
        "remote": false,
        "run": "./",
      }
    `);

    expect(await cli.run(['--no-local'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "local": false,
        "remote": false,
        "run": "./",
      }
    `);

    expect(await cli.run(['--no-local', '--remote'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "local": false,
        "remote": true,
        "run": "./",
      }
    `);

    expect(await cli.run(['--run', 'abc', '--no-local', '--remote']))
      .toMatchInlineSnapshot(`
      {
        "--": [],
        "local": false,
        "remote": true,
        "run": "abc",
      }
    `);
  });

  it('should parse negtive boolean option', async () => {
    const cli = breadc('cli');
    cli.option('--no-open');
    cli.command('').action((o) => o);

    expect(await cli.run(['--open'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "open": true,
      }
    `);

    expect(await cli.run(['--no-open'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "open": false,
      }
    `);
  });

  it('should parse boolean option with value', async () => {
    const cli = breadc('cli').option('--open');
    cli.command('').action((o) => o.open);

    expect(await cli.run(['--open=true'])).toMatchInlineSnapshot('true');

    expect(await cli.run(['--open=YES'])).toMatchInlineSnapshot('true');

    expect(await cli.run(['--open=T'])).toMatchInlineSnapshot('true');

    expect(await cli.run(['--open=y'])).toMatchInlineSnapshot('true');

    expect(await cli.run(['--open=false'])).toMatchInlineSnapshot('false');

    expect(await cli.run(['--open=No'])).toMatchInlineSnapshot('false');

    expect(await cli.run(['--open=f'])).toMatchInlineSnapshot('false');

    expect(await cli.run(['--open=N'])).toMatchInlineSnapshot('false');

    expect(await cli.run(['--no-open=true'])).toMatchInlineSnapshot('false');

    expect(await cli.run(['--no-open=false'])).toMatchInlineSnapshot('true');

    expect(
      async () => await cli.run(['--open=hello'])
    ).rejects.toThrowErrorMatchingInlineSnapshot('"Unexpected value hello for --open"');
  });

  it('should parse string option', async () => {
    const cli = breadc('cli');
    cli.option('--flag');
    cli.option('--host <addr>');
    cli.command('').action(DEFAULT_ACTION);

    expect(await cli.run(['--host', '1.1.1.1'])).toMatchInlineSnapshot(`
      [
        {
          "--": [],
          "flag": false,
          "host": "1.1.1.1",
        },
      ]
    `);
    expect(await cli.run(['--host=1.1.1.1', '--flag'])).toMatchInlineSnapshot(`
      [
        {
          "--": [],
          "flag": true,
          "host": "1.1.1.1",
        },
      ]
    `);
  });

  it('should parse camel case option', async () => {
    const cli = breadc('cli');
    cli.option('--allow-page');
    cli.option('--allow-index', { default: true });
    cli.option('--page-index <no>', { default: '1' });
    cli.command('').action(DEFAULT_ACTION);

    expect(await cli.run(['--page-index', '1'])).toMatchInlineSnapshot(`
      [
        {
          "--": [],
          "allowIndex": true,
          "allowPage": false,
          "pageIndex": "1",
        },
      ]
    `);

    expect(await cli.run(['--page-index=1'])).toMatchInlineSnapshot(`
      [
        {
          "--": [],
          "allowIndex": true,
          "allowPage": false,
          "pageIndex": "1",
        },
      ]
    `);

    expect(await cli.run(['--allow-page', '--no-allow-index']))
      .toMatchInlineSnapshot(`
        [
          {
            "--": [],
            "allowIndex": false,
            "allowPage": true,
            "pageIndex": "1",
          },
        ]
      `);
  });

  it('should parse string option cast', async () => {
    const cli = breadc('cli').option('--page <page>', {
      default: '1',
      cast: (t) => +t
    });
    cli.command('').action((option) => {
      return option.page;
    });

    expect(await cli.run([])).toMatchInlineSnapshot('1');
    expect(await cli.run(['--page', '2'])).toMatchInlineSnapshot('2');
    expect(await cli.run(['--page=2'])).toMatchInlineSnapshot('2');
  });

  it('should parse boolean option cast', async () => {
    const cli = breadc('cli').option('--remote', {
      cast: (f) => (f ? 'remote' : 'local')
    });
    cli.command('').action((option) => {
      return option.remote;
    });

    expect(await cli.run([])).toMatchInlineSnapshot('"local"');
    expect(await cli.run(['--remote'])).toMatchInlineSnapshot('"remote"');
  });

  it('should parse boolean negative option cast', async () => {
    const cli = breadc('cli').option('--remote', {
      default: true,
      cast: (f) => (f ? 'remote' : 'local')
    });
    cli.command('').action((option) => {
      return option.remote;
    });

    expect(await cli.run([])).toMatchInlineSnapshot('"remote"');
    expect(await cli.run(['--remote'])).toMatchInlineSnapshot('"remote"');
    expect(await cli.run(['--no-remote'])).toMatchInlineSnapshot('"local"');
  });
});
