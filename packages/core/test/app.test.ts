import { describe, it, expect } from 'vitest';

import type { InternalBreadc, InternalCommand } from '../src/breadc/index.ts';

import { context as makeContext } from '../src/runtime/context.ts';
import { breadc, group, command, option } from '../src/breadc/index.ts';

describe('app', () => {
  it('should accept option instances', () => {
    const opt = option('--flag');
    const app = breadc('cli').option(opt);
    const result = app.parse(['--flag']);
    expect(result.options).toMatchInlineSnapshot(`{}`);
  });

  it('should register default unknown option middleware', () => {
    const app = breadc('cli') as unknown as InternalBreadc;
    app.allowUnknownOption();

    expect(app._unknownOptionMiddlewares.length).toMatchInlineSnapshot(`1`);
  });

  it('default unknown option middleware should return name/value', () => {
    const app = breadc('cli') as unknown as InternalBreadc;
    app.allowUnknownOption();

    const middleware = app._unknownOptionMiddlewares[0];
    const result = middleware(makeContext(app, []), '-x', '1');
    expect(result).toMatchInlineSnapshot(`
      {
        "name": "-x",
        "value": "1",
      }
    `);
  });

  it('should pass description into command init', () => {
    const app = breadc('cli');
    const cmd = app.command('ping', 'Ping command') as unknown as InternalCommand;

    cmd._resolve();
    expect(cmd.init).toMatchInlineSnapshot(`
      {
        "description": "Ping command",
      }
    `);
  });

  it('should accept prebuilt group and command', () => {
    const app = breadc('cli');
    const grp = group('store');
    const cmd = command('echo');

    expect(Object.is(app.group(grp), grp)).toMatchInlineSnapshot(`true`);
    expect(Object.is(app.command(cmd), cmd)).toMatchInlineSnapshot(`true`);
  });
});
