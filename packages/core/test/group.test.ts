import { describe, it, expect } from 'vitest';

import {
  type InternalCommand,
  type InternalGroup,
  group
} from '../src/breadc/index.ts';
import { buildGroup } from '../src/runtime/builder.ts';

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

  it('should resolve command pieces with group prefix', () => {
    const grp = group('store ops') as unknown as InternalGroup;
    const cmd = grp.command('ls') as unknown as InternalCommand;
    grp._resolve();
    buildGroup(grp);

    expect(cmd._pieces).toMatchInlineSnapshot(`
      [
        [
          "store",
          "ops",
          "ls",
        ],
      ]
    `);
  });
});
