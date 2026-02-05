import { describe, it, expect } from 'vitest';

import { type InternalGroup, breadc, group, command, option } from '../src/breadc/index.ts';

describe('group', () => {
  it('should resolve pieces', () => {
    const grp = group(' dev   tools ') as unknown as InternalGroup;
    grp._resolve();

    expect(grp._pieces).toMatchInlineSnapshot(`
      [
        [
          "dev",
          "tools",
        ],
      ]
    `);
  });

  it('should reject empty spec', () => {
    expect(() => group('')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Group spec should not be empty at the command "", position 0]`
    );
  });

  it('should reject arguments in group spec', () => {
    const grp = group('dev <path>') as unknown as InternalGroup;
    expect(() => grp._resolve()).toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving argument in group spec at the command "dev <path>", position 4]`
    );
  });

  it('should register existing group and command instances', () => {
    const app = breadc('cli');
    const grp = group('store');
    const cmd = command('echo');

    const registeredGroup = app.group(grp as never) as unknown;
    const registeredCommand = app.command(cmd as never) as unknown;

    expect(Object.is(registeredGroup, grp as unknown)).toMatchInlineSnapshot(`true`);
    expect(Object.is(registeredCommand, cmd as unknown)).toMatchInlineSnapshot(`true`);
  });

  it('should accept option and command instances', () => {
    const grp = group('store') as unknown as InternalGroup;
    const opt = option('--flag');
    const cmd = command('echo');

    grp.option(opt);
    grp.command(cmd);
    grp._resolve();

    expect(Object.is(grp._options[0], opt)).toMatchInlineSnapshot(`true`);
    expect(Object.is(grp._commands[0], cmd)).toMatchInlineSnapshot(`true`);
  });
});
