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

  it('register default unknown option handler', () => {
    const app = breadc('cli');
    app.allowUnknownOption();

    expect((app as unknown as InternalBreadc)._unknownOptionHandlers.length).toMatchInlineSnapshot(`1`);
  });

  it('default unknown option handler should return name/value', () => {
    const app = breadc('cli');
    app.allowUnknownOption();

    const handler = (app as unknown as InternalBreadc)._unknownOptionHandlers[0];
    const result = handler(makeContext(app, []), '-x', '1');
    expect(result).toMatchInlineSnapshot(`
      {
        "name": "-x",
        "value": "1",
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
