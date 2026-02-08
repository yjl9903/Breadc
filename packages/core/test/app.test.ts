import { describe, it, expect } from 'vitest';

import type { InternalBreadc } from '../src/breadc/index.ts';

import { resolveCommand } from '../src/runtime/builder.ts';
import { context as makeContext } from '../src/runtime/context.ts';
import { breadc, group, command, option } from '../src/breadc/index.ts';

describe('breadc/app', () => {
  it('accept option instances', () => {
    const opt = option('--flag');
    const app = breadc('cli').option(opt);
    const result = app.parse(['--flag']);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "flag": true,
      }
    `);
  });

  it('register default unknown option middleware', () => {
    const app = breadc('cli');
    app.allowUnknownOption();

    expect((app as unknown as InternalBreadc)._unknownOptionMiddlewares.length).toMatchInlineSnapshot(`1`);
  });

  it('default unknown option middleware should return name/value', () => {
    const app = breadc('cli');
    app.allowUnknownOption();

    const middleware = (app as unknown as InternalBreadc)._unknownOptionMiddlewares[0];
    const result = middleware(makeContext(app, []), '-x', '1');
    expect(result).toMatchInlineSnapshot(`
      {
        "name": "-x",
        "value": "1",
      }
    `);
  });

  it('pass description into command init', () => {
    const app = breadc('cli');
    const cmd = app.command('ping', 'Ping command');

    resolveCommand(cmd);

    expect(cmd.init).toMatchInlineSnapshot(`
      {
        "description": "Ping command",
      }
    `);
  });

  it('accept prebuilt group and command', () => {
    const app = breadc('cli');
    const grp = group('store');
    const cmd = command('echo');

    expect(Object.is(app.group(grp), grp)).toMatchInlineSnapshot(`true`);
    expect(Object.is(app.command(cmd), cmd)).toMatchInlineSnapshot(`true`);
  });
});
