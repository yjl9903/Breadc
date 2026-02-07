import { describe, it, expect } from 'vitest';

import type { InternalOption } from '../src/breadc/index.ts';

import { BreadcAppError } from '../src/error.ts';
import { breadc, option } from '../src/breadc/index.ts';

describe('runtime', () => {
  it('passes arguments to action and returns result', async () => {
    const app = breadc('cli');
    app.command('echo <first> [second]').action((first, second, options) => [first, second, options]);

    await expect(app.run(['echo', 'hello'])).resolves.toMatchInlineSnapshot(`
      [
        "hello",
        undefined,
        {
          "--": [],
        },
      ]
    `);
  });

  it('returns builtin version/help when configured', async () => {
    const app = breadc('cli', { builtin: { version: false, help: false } });
    const version = option('-v, --version') as unknown as InternalOption;
    const help = option('-h, --help') as unknown as InternalOption;

    app.option(version);
    app.option(help);
    (app as any)._version = version;
    (app as any)._help = help;

    await expect(app.run(['-v'])).resolves.toMatchInlineSnapshot(`"cli/unknown"`);
    await expect(app.run(['-h'])).resolves.toMatchInlineSnapshot(`"cli/unknown"`);
  });

  it('invokes next when middleware does not call it', async () => {
    const app = breadc('cli');
    const calls: string[] = [];

    app.use(async (ctx, _next) => {
      calls.push('middleware');
      return ctx;
    });

    app.command('ping').action(() => {
      calls.push('action');
      return 'pong';
    });

    await expect(app.run(['ping'])).resolves.toMatchInlineSnapshot(`"pong"`);
    expect(calls).toMatchInlineSnapshot(`
      [
        "middleware",
        "action",
      ]
    `);
  });

  it('uses unknown command middleware', async () => {
    const app = breadc('cli');
    app.onUnknownCommand(() => 'handled');

    await expect(app.run(['unknown'])).resolves.toMatchInlineSnapshot(`"handled"`);
  });

  it('runs middlewares in app → group → command order', async () => {
    const app = breadc('cli');
    const order: string[] = [];

    app.use(async (_ctx, next) => {
      order.push('app:before');
      const result = await next();
      order.push('app:after');
      return result;
    });

    const grp = app.group('tool').use(async (_ctx, next) => {
      order.push('group:before');
      const result = await next();
      order.push('group:after');
      return result;
    });

    grp
      .command('run')
      .use(async (_ctx, next) => {
        order.push('command:before');
        const result = await next();
        order.push('command:after');
        return result;
      })
      .action(() => {
        order.push('action');
        return 'ok';
      });

    await app.run(['tool', 'run']);

    expect(order).toMatchInlineSnapshot(`
      [
        "app:before",
        "group:before",
        "command:before",
        "action",
        "command:after",
        "group:after",
        "app:after",
      ]
    `);
  });

  it('merges middleware data and allows override', async () => {
    const app = breadc('cli');
    const seen: Array<Record<string, unknown>> = [];

    app.use(async (ctx, next) => {
      const result = await next({ data: { count: 1 } });
      seen.push({ ...ctx.data });
      return result;
    });

    const grp = app.group('tool').use(async (ctx, next) => {
      const result = await next({ data: { count: 2, group: true } });
      seen.push({ ...ctx.data });
      return result;
    });

    grp
      .command('run')
      .use(async (ctx, next) => {
        const result = await next({ data: { count: 3, command: true } });
        seen.push({ ...ctx.data });
        return result;
      })
      .action(() => 'ok');

    await app.run(['tool', 'run']);

    expect(seen).toMatchInlineSnapshot(`
      [
        {
          "command": true,
          "count": 3,
          "group": true,
        },
        {
          "command": true,
          "count": 3,
          "group": true,
        },
        {
          "command": true,
          "count": 3,
          "group": true,
        },
      ]
    `);
  });

  it('throws when no action is bound', async () => {
    const app = breadc('cli');
    app.command('noop');

    await expect(app.run(['noop'])).rejects.toThrowError(BreadcAppError.NO_ACTION_BOUND);
  });

  it('forwards options["--"] to action', async () => {
    const app = breadc('cli');
    app.command('echo').action((options) => options['--']);

    await expect(app.run(['echo', '--', 'a', 'b'])).resolves.toMatchInlineSnapshot(
      `
      [
        "a",
        "b",
      ]
    `
    );
  });
});
