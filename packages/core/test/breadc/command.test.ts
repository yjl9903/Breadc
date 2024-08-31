import { describe, it, expect } from 'vitest';

import { Breadc } from '../../src/breadc/app.ts';
import { Argument, Command, makeCommand } from '../../src/breadc/command.ts';

describe('command', () => {
  it('should register action function', () => {
    const cmd = new Command('submodule add <abc> [def] [...rest]');
    cmd.action(() => {
      return true;
    });
  });

  it('should resolve const pieces after the first time', () => {
    const cmd = makeCommand(new Command('submodule add <abc> [def] [...rest]'));
    cmd.resolveSubCommand();
    expect(cmd.pieces).toMatchInlineSnapshot(`
      [
        "submodule",
      ]
    `);
    expect(cmd.requireds).toMatchInlineSnapshot(`[]`);
    expect(cmd.optionals).toMatchInlineSnapshot(`[]`);
    expect(cmd.spread).toMatchInlineSnapshot(`undefined`);
  });

  it('should resolve const pieces after the second time', () => {
    const cmd = makeCommand(new Command('submodule add <abc> [def] [...rest]'));
    cmd.resolveSubCommand();
    cmd.resolveSubCommand();
    expect(cmd.pieces).toMatchInlineSnapshot(`
      [
        "submodule",
        "add",
      ]
    `);
    expect(cmd.requireds).toMatchInlineSnapshot(`[]`);
    expect(cmd.optionals).toMatchInlineSnapshot(`[]`);
    expect(cmd.spread).toMatchInlineSnapshot(`undefined`);
  });

  it('should resolve const pieces with spaces', () => {
    const cmd = makeCommand(
      new Command('   submodule    add    <abc>   [def] [...rest]')
    );

    cmd.resolveSubCommand();
    expect(cmd.pieces).toMatchInlineSnapshot(`
      [
        "submodule",
      ]
    `);

    cmd.resolveSubCommand();
    expect(cmd.pieces).toMatchInlineSnapshot(`
      [
        "submodule",
        "add",
      ]
    `);
    expect(cmd.requireds).toMatchInlineSnapshot(`[]`);
    expect(cmd.optionals).toMatchInlineSnapshot(`[]`);
    expect(cmd.spread).toMatchInlineSnapshot(`undefined`);

    cmd.resolve();
    expect(cmd.requireds).toMatchInlineSnapshot(`
      [
        {
          "config": {},
          "format": "<abc>",
          "name": "abc",
          "type": "required",
        },
      ]
    `);
    expect(cmd.optionals).toMatchInlineSnapshot(`
      [
        {
          "config": {},
          "format": "[def]",
          "name": "def",
          "type": "optional",
        },
      ]
    `);
    expect(cmd.spread).toMatchInlineSnapshot(`
      {
        "config": {},
        "format": "[...rest]",
        "name": "rest",
        "type": "spread",
      }
    `);
  });

  it('should resolve after the second time', () => {
    const cmd = makeCommand(new Command('submodule add <abc> [def] [...rest]'));
    cmd.resolve();
    cmd.resolve();
    expect(cmd.pieces).toMatchInlineSnapshot(`
      [
        "submodule",
        "add",
      ]
    `);
    expect(cmd.requireds).toMatchInlineSnapshot(`
      [
        {
          "config": {},
          "format": "<abc>",
          "name": "abc",
          "type": "required",
        },
      ]
    `);
    expect(cmd.optionals).toMatchInlineSnapshot(`
      [
        {
          "config": {},
          "format": "[def]",
          "name": "def",
          "type": "optional",
        },
      ]
    `);
    expect(cmd.spread).toMatchInlineSnapshot(`
      {
        "config": {},
        "format": "[...rest]",
        "name": "rest",
        "type": "spread",
      }
    `);
  });

  it('should resolve duplicated spaces', () => {
    const cmd = makeCommand(
      new Command('submodule     add     <abc>     [def]     [...rest]')
    );
    cmd.resolve();
    cmd.resolve();
    expect(cmd.pieces).toMatchInlineSnapshot(`
      [
        "submodule",
        "add",
      ]
    `);
    expect(cmd.requireds).toMatchInlineSnapshot(`
      [
        {
          "config": {},
          "format": "<abc>",
          "name": "abc",
          "type": "required",
        },
      ]
    `);
    expect(cmd.optionals).toMatchInlineSnapshot(`
      [
        {
          "config": {},
          "format": "[def]",
          "name": "def",
          "type": "optional",
        },
      ]
    `);
    expect(cmd.spread).toMatchInlineSnapshot(`
      {
        "config": {},
        "format": "[...rest]",
        "name": "rest",
        "type": "spread",
      }
    `);
  });

  it('should resolve alias command format', () => {
    const cmd = makeCommand(
      new Command('submodule add <abc> [def] [...rest]').alias('sub   add')
    );
    cmd.resolve();
    expect(cmd.pieces).toMatchInlineSnapshot(`
      [
        "submodule",
        "add",
      ]
    `);
    expect(cmd.requireds).toMatchInlineSnapshot(`
      [
        {
          "config": {},
          "format": "<abc>",
          "name": "abc",
          "type": "required",
        },
      ]
    `);
    expect(cmd.optionals).toMatchInlineSnapshot(`
      [
        {
          "config": {},
          "format": "[def]",
          "name": "def",
          "type": "optional",
        },
      ]
    `);
    expect(cmd.spread).toMatchInlineSnapshot(`
      {
        "config": {},
        "format": "[...rest]",
        "name": "rest",
        "type": "spread",
      }
    `);
  });

  it('should receive manual arguments', () => {
    const app = new Breadc('cli');
    app
      .command('')
      .argument('<required>')
      .argument('[optional]')
      .argument('[...rest]')
      .action((arg1, arg2, arg3) => {
        return [arg1, arg2, arg3];
      });

    expect(app.runSync(['a1', 'a2', 'a3', 'a4'])).toMatchInlineSnapshot(`
      [
        "a1",
        "a2",
        [
          "a3",
          "a4",
        ],
      ]
    `);
  });

  it('should receive manual added arguments', () => {
    const app = new Breadc('cli');
    app
      .command('')
      .argument('<required>')
      .addArgument(
        new Argument('[optional]', { initial: '1', cast: (t) => +t! })
      )
      .addArgument(new Argument('[...rest]', { initial: ['rest1', 'rest2'] }))
      .action((arg1, arg2, arg3) => {
        return [arg1, arg2, arg3];
      });

    expect(app.runSync(['a1'])).toMatchInlineSnapshot(`
      [
        "a1",
        1,
        [
          "rest1",
          "rest2",
        ],
      ]
    `);
  });

  it('should find invalid required arguments', () => {
    expect(async () => {
      const cmd = makeCommand(new Command('submodule add <'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid required argument at the command "submodule add <", position 14]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule add < [def]'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid required argument at the command "submodule add < [def]", position 14]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule add <abc [def]'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid required argument at the command "submodule add <abc [def]", position 24]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule add <abc>ghi [def]'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid required argument at the command "submodule add <abc>ghi [def]", position 19]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule <def> add [abc]'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Sub-command should be placed in the beginning at the command "submodule <def> add [abc]", position 16]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule add [abc] <def>'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Required argument should be placed before optional arguments at the command "submodule add [abc] <def>", position 21]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule add <>'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid empty argument at the command "submodule add <>", position 16]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule add []'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid empty argument at the command "submodule add []", position 16]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule add [...]'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid empty argument at the command "submodule add [...]", position 19]`
    );

    expect(async () => {
      const cmd = makeCommand(
        new Command('submodule add [...rest]').alias('add [...rest]')
      );
      cmd.resolve();
      cmd.resolveAliasSubCommand(0).resolveAliasSubCommand(0);
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Alias command format should not have arguments at the command "add [...rest]", position 4]`
    );
  });

  it('should find invalid optional arguments', () => {
    expect(async () => {
      const cmd = makeCommand(new Command('submodule add ['));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid optional argument at the command "submodule add [", position 14]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule add [ [def]'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid optional argument at the command "submodule add [ [def]", position 14]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule add [abc'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid optional argument at the command "submodule add [abc", position 18]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule add [abc]def'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid optional argument at the command "submodule add [abc]def", position 19]`
    );

    {
      const cmd = makeCommand(new Command('submodule add [abc [def]'));
      cmd.resolve().resolve();
      expect(cmd.optionals).toMatchInlineSnapshot(`
        [
          {
            "config": {},
            "format": "[abc [def]",
            "name": "abc [def",
            "type": "optional",
          },
        ]
      `);
    }

    expect(async () => {
      const cmd = makeCommand(new Command('submodule [def] add [...abc]'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Sub-command should be placed in the beginning at the command "submodule [def] add [...abc]", position 16]`
    );
  });

  it('should find invalid spread arguments', () => {
    expect(async () => {
      const cmd = makeCommand(new Command('submodule add [...'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid spread argument at the command "submodule add [...", position 18]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule add [... <abc>'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid spread argument at the command "submodule add [... <abc>", position 24]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule add [...rest <abc>'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid spread argument at the command "submodule add [...rest <abc>", position 28]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule add [...rest]def <abc>'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid spread argument at the command "submodule add [...rest]def <abc>", position 23]`
    );

    expect(async () => {
      const cmd = makeCommand(new Command('submodule add [...rest] [abc]'));
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Optional argument should be placed before spread arguments at the command "submodule add [...rest] [abc]", position 25]`
    );

    expect(async () => {
      const cmd = makeCommand(
        new Command('submodule add [...rest1] [...rest2]')
      );
      cmd.resolve().resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Spread argument can only appear once at the command "submodule add [...rest1] [...rest2]", position 26]`
    );
  });

  it('should run action function', () => {
    const cmd = new Command('submodule add <abc> [def] [...rest]').action(
      (a, b, c) => {
        return [a, b, c];
      }
    );

    expect(cmd.run('a', 'b', ['c'], { '--': [] })).toMatchInlineSnapshot(`
      [
        "a",
        "b",
        [
          "c",
        ],
      ]
    `);

    expect(() => {
      const cmd = new Command('submodule add <abc> [def] [...rest]');
      cmd.run('a', 'b', ['c'], { '--': [] });
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no action function bound in this command]`
    );
  });
});
