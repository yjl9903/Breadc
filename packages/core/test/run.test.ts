import { describe, it, expect } from 'vitest';

import { breadc } from '../src/breadc/index.ts';
import { RuntimeError } from '../src/error.ts';

describe('runtime', () => {
  it('passes arguments to action and returns result', async () => {
    const app = breadc('cli');
    app
      .command('echo <first> [second]')
      .action((first: string, second: string | undefined, options: {}) => [
        first,
        second,
        options
      ]);

    await expect(app.run(['echo', 'hello'])).resolves.toMatchInlineSnapshot(`
      [
        "hello",
        undefined,
        {},
      ]
    `);
  });

  it('runs middlewares in app → group → command order', async () => {
    const app = breadc('cli');
    const order: string[] = [];

    app.use(async (_ctx, next) => {
      order.push('app');
      const result = await next();
      order.push('app:after');
      return result;
    });

    const grp = app.group('tool').use(async (_ctx, next) => {
      order.push('group');
      const result = await next();
      order.push('group:after');
      return result;
    });

    grp
      .command('run')
      .use(async (_ctx, next) => {
        order.push('command');
        const result = await next();
        order.push('command:after');
        return result;
      })
      .action(() => {
        order.push('action');
        return 'ok';
      });

    await app.run(['tool', 'run']);

    expect(order).toEqual([
      'app',
      'group',
      'command',
      'action',
      'command:after',
      'group:after',
      'app:after'
    ]);
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

    expect(seen).toEqual([
      { command: true, count: 3, group: true },
      { command: true, count: 3, group: true },
      { command: true, count: 3, group: true }
    ]);
  });

  it('throws when no action is bound', async () => {
    const app = breadc('cli');
    app.command('noop');

    await expect(app.run(['noop'])).rejects.toBeInstanceOf(RuntimeError);
  });

  it.todo('forwards options["--"] to action');
});
