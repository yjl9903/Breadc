import { describe, it, expect } from 'vitest';

import { Command } from '../../src/breadc/command.ts';

describe('command', () => {
  it('should register action function', () => {
    const cmd = new Command('submodule add <abc> [def] [...rest]');
    cmd.action(() => {
      return true;
    });
  });

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

  it('should resolve duplicated spaces', () => {
    const cmd = new Command('submodule   add   <abc>   [def]   [...rest]');
    cmd.resolve();
    cmd.resolve();
    expect(cmd.pieces).toMatchInlineSnapshot(`
      [
        "submodule",
        "dd",
        "abc>",
        "def]",
        "...rest]",
      ]
    `);
    expect(cmd.required).toMatchInlineSnapshot(`[]`);
    expect(cmd.optionals).toMatchInlineSnapshot(`[]`);
    expect(cmd.spread).toMatchInlineSnapshot(`undefined`);
  });

  it('should find invalid required arguments', () => {
    expect(async () => {
      const cmd = new Command('submodule add <');
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid required argument at the command "submodule add <", position 14]`
    );

    expect(async () => {
      const cmd = new Command('submodule add < [def]');
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid required argument at the command "submodule add < [def]", position 14]`
    );

    expect(async () => {
      const cmd = new Command('submodule add <abc [def]');
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid required argument at the command "submodule add <abc [def]", position 24]`
    );

    expect(async () => {
      const cmd = new Command('submodule add [abc] <def>');
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Required argument should be placed before optional arguments at the command "submodule add [abc] <def>", position 21]`
    );
  });

  it('should find invalid optional arguments', () => {
    expect(async () => {
      const cmd = new Command('submodule add [');
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid optional argument at the command "submodule add [", position 14]`
    );

    expect(async () => {
      const cmd = new Command('submodule add [ [def]');
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid optional argument at the command "submodule add [ [def]", position 14]`
    );

    expect(async () => {
      const cmd = new Command('submodule add [abc');
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid optional argument at the command "submodule add [abc", position 18]`
    );

    {
      const cmd = new Command('submodule add [abc [def]');
      cmd.resolve().resolve();
      expect(cmd.optionals).toMatchInlineSnapshot(`
        [
          "abc [def",
        ]
      `);
    }
  });

  it('should find invalid spread arguments', () => {
    expect(async () => {
      const cmd = new Command('submodule add [...');
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid spread argument at the command "submodule add [...", position 18]`
    );

    expect(async () => {
      const cmd = new Command('submodule add [... <abc>');
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid spread argument at the command "submodule add [... <abc>", position 24]`
    );

    expect(async () => {
      const cmd = new Command('submodule add [...rest] [abc]');
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Optional argument should be placed before spread arguments at the command "submodule add [...rest] [abc]", position 25]`
    );

    expect(async () => {
      const cmd = new Command('submodule add [...rest1] [...rest2]');
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Spread argument can only appear once at the command "submodule add [...rest1] [...rest2]", position 26]`);
  });
});
