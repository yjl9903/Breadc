import { describe, it, expect } from 'vitest';

import { Command } from '../../src/breadc/command.ts';

describe('command', () => {
  it('should resolve const pieces after the first time', () => {
    const cmd = new Command('submodule add <abc> [def] [...rest]');
    cmd.resolve();
    expect(cmd.pieces).toMatchInlineSnapshot(`
      [
        "submodule",
        "add",
      ]
    `);
    expect(cmd.required).toMatchInlineSnapshot(`undefined`);
    expect(cmd.optionals).toMatchInlineSnapshot(`undefined`);
    expect(cmd.spread).toMatchInlineSnapshot(`undefined`);
  });

  it('should resolve after the second time', () => {
    const cmd = new Command('submodule add <abc> [def] [...rest]');
    cmd.resolve();
    cmd.resolve();
    expect(cmd.pieces).toMatchInlineSnapshot(`
      [
        "submodule",
        "add",
      ]
    `);
    expect(cmd.required).toMatchInlineSnapshot(`
      [
        "abc",
      ]
    `);
    expect(cmd.optionals).toMatchInlineSnapshot(`
      [
        "def",
      ]
    `);
    expect(cmd.spread).toMatchInlineSnapshot(`"rest"`);
  });

  // TODO: test errors
});
