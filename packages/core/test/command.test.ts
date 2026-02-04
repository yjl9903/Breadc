import { describe, it, expect } from 'vitest';

import {
  type InternalCommand,
  command,
  argument
} from '../src/breadc/index.ts';

describe('command', () => {
  it('should resolve const pieces', () => {
    const cmd = command(
      'submodule add <abc> [def] [...rest]'
    ) as unknown as InternalCommand;
    cmd._resolve();

    expect(cmd._pieces).toMatchInlineSnapshot(`
      [
        [
          "submodule",
          "add",
        ],
      ]
    `);
    expect(cmd._arguments).toMatchInlineSnapshot(`
      [
        {
          "init": {},
          "name": "abc",
          "spec": "",
          "type": "required",
        },
        {
          "init": {},
          "name": "def",
          "spec": "",
          "type": "optional",
        },
        {
          "init": {},
          "name": "rest",
          "spec": "",
          "type": "spread",
        },
      ]
    `);
  });

  it('should resolve const pieces with spaces', () => {
    const cmd = command(
      '   submodule    add    <abc>   [def] [...rest]'
    ) as unknown as InternalCommand;
    cmd._resolve();

    expect(cmd._pieces).toMatchInlineSnapshot(`
      [
        [
          "submodule",
          "add",
        ],
      ]
    `);
    expect(cmd._arguments).toMatchInlineSnapshot(`
      [
        {
          "init": {},
          "name": "abc",
          "spec": "",
          "type": "required",
        },
        {
          "init": {},
          "name": "def",
          "spec": "",
          "type": "optional",
        },
        {
          "init": {},
          "name": "rest",
          "spec": "",
          "type": "spread",
        },
      ]
    `);
  });

  it('should resolve after the second time', () => {
    const cmd = command(
      'submodule add <abc> [def] [...rest]'
    ) as unknown as InternalCommand;
    cmd._resolve();

    expect(cmd._pieces).toMatchInlineSnapshot(`
      [
        [
          "submodule",
          "add",
        ],
      ]
    `);
    expect(cmd._arguments).toMatchInlineSnapshot(`
      [
        {
          "init": {},
          "name": "abc",
          "spec": "",
          "type": "required",
        },
        {
          "init": {},
          "name": "def",
          "spec": "",
          "type": "optional",
        },
        {
          "init": {},
          "name": "rest",
          "spec": "",
          "type": "spread",
        },
      ]
    `);
  });

  it('should resolve duplicated spaces', () => {
    const cmd = command(
      'submodule     add     <abc>     [def]     [...rest]'
    ) as unknown as InternalCommand;
    cmd._resolve();

    expect(cmd._pieces).toMatchInlineSnapshot(`
      [
        [
          "submodule",
          "add",
        ],
      ]
    `);
    expect(cmd._arguments).toMatchInlineSnapshot(`
      [
        {
          "init": {},
          "name": "abc",
          "spec": "",
          "type": "required",
        },
        {
          "init": {},
          "name": "def",
          "spec": "",
          "type": "optional",
        },
        {
          "init": {},
          "name": "rest",
          "spec": "",
          "type": "spread",
        },
      ]
    `);
  });

  it('should resolve alias command format', () => {
    const cmd = command('submodule add <abc> [def] [...rest]').alias(
      'sub   add'
    ) as unknown as InternalCommand;
    cmd._resolve();
    expect(cmd._pieces).toMatchInlineSnapshot(`
      [
        [
          "submodule",
          "add",
        ],
        [
          "sub",
          "add",
        ],
      ]
    `);
    expect(cmd._arguments).toMatchInlineSnapshot(`
      [
        {
          "init": {},
          "name": "abc",
          "spec": "",
          "type": "required",
        },
        {
          "init": {},
          "name": "def",
          "spec": "",
          "type": "optional",
        },
        {
          "init": {},
          "name": "rest",
          "spec": "",
          "type": "spread",
        },
      ]
    `);
  });

  it('should resolve default command', () => {
    const cmd = command('<abc> [def]') as unknown as InternalCommand;
    cmd._resolve();

    expect(cmd._default).toBe(true);
    expect(cmd._pieces).toMatchInlineSnapshot(`
      [
        [],
      ]
    `);
    expect(cmd._arguments).toMatchInlineSnapshot(`
      [
        {
          "init": {},
          "name": "abc",
          "spec": "",
          "type": "required",
        },
        {
          "init": {},
          "name": "def",
          "spec": "",
          "type": "optional",
        },
      ]
    `);
  });

  it('should resolve multi-level sub-commands', () => {
    const cmd = command('dev run <target>') as unknown as InternalCommand;
    cmd._resolve();

    expect(cmd._pieces).toMatchInlineSnapshot(`
      [
        [
          "dev",
          "run",
        ],
      ]
    `);
    expect(cmd._arguments).toMatchInlineSnapshot(`
      [
        {
          "init": {},
          "name": "target",
          "spec": "",
          "type": "required",
        },
      ]
    `);
  });

  it('should resolve valid aliases without arguments', () => {
    const cmd = command('dev run')
      .alias('d r')
      .alias('dr') as unknown as InternalCommand;
    cmd._resolve();

    expect(cmd._pieces).toMatchInlineSnapshot(`
      [
        [
          "dev",
          "run",
        ],
        [
          "d",
          "r",
        ],
        [
          "dr",
        ],
      ]
    `);
  });

  it('should resolve custom arguments', () => {
    const cmd = command('dev')
      .argument(argument('<arg>'))
      .argument(argument('[opt]'))
      .argument(argument('[...rest]')) as unknown as InternalCommand;
    cmd._resolve();

    expect(cmd._arguments).toMatchInlineSnapshot(`
      [
        {
          "init": undefined,
          "name": "arg",
          "spec": "<arg>",
          "type": "required",
        },
        {
          "init": undefined,
          "name": "opt",
          "spec": "[opt]",
          "type": "optional",
        },
        {
          "init": undefined,
          "name": "rest",
          "spec": "[...rest]",
          "type": "spread",
        },
      ]
    `);
  });

  it('should reject invalid custom argument ordering', async () => {
    await expect(async () => {
      const cmd = command('dev [opt]').argument(
        '<req>'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Required argument should be placed before optional arguments at the command "dev [opt]", position 9]`
    );

    await expect(async () => {
      const cmd = command('dev [...rest]').argument(
        '[opt]'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Optional argument should be placed before spread arguments at the command "dev [...rest]", position 13]`
    );

    await expect(async () => {
      const cmd = command('dev')
        .argument('[...rest1]')
        .argument('[...rest2]') as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Spread argument can only appear once at the command "dev", position 3]`
    );
  });

  it('should find invalid required arguments', async () => {
    await expect(async () => {
      const cmd = command('submodule add <') as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid required argument at the command "submodule add <", position 14]`
    );

    await expect(async () => {
      const cmd = command(
        'submodule add < [def]'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid required argument at the command "submodule add < [def]", position 14]`
    );

    await expect(async () => {
      const cmd = command(
        'submodule add <abc [def]'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid required argument at the command "submodule add <abc [def]", position 24]`
    );

    await expect(async () => {
      const cmd = command(
        'submodule add <abc>ghi [def]'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid required argument at the command "submodule add <abc>ghi [def]", position 19]`
    );

    await expect(async () => {
      const cmd = command(
        'submodule <def> add [abc]'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Sub-command should be placed in the beginning at the command "submodule <def> add [abc]", position 16]`
    );

    await expect(async () => {
      const cmd = command(
        'submodule add [abc] <def>'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Required argument should be placed before optional arguments at the command "submodule add [abc] <def>", position 21]`
    );

    await expect(async () => {
      const cmd = command('submodule add <>') as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid empty argument at the command "submodule add <>", position 16]`
    );

    await expect(async () => {
      const cmd = command('submodule add []') as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid empty argument at the command "submodule add []", position 16]`
    );

    await expect(async () => {
      const cmd = command('submodule add [...]') as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid empty argument at the command "submodule add [...]", position 19]`
    );

    await expect(async () => {
      const cmd = command('submodule add [...rest]').alias(
        'add [...rest]'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Alias command format should not have arguments at the command "add [...rest]", position 4]`
    );
  });

  it('should find invalid optional arguments', async () => {
    await expect(async () => {
      const cmd = command('submodule add [') as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid optional argument at the command "submodule add [", position 14]`
    );

    await expect(async () => {
      const cmd = command(
        'submodule add [ [def]'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid optional argument at the command "submodule add [ [def]", position 14]`
    );

    await expect(async () => {
      const cmd = command('submodule add [abc') as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid optional argument at the command "submodule add [abc", position 18]`
    );

    await expect(async () => {
      const cmd = command(
        'submodule add [abc]def'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid optional argument at the command "submodule add [abc]def", position 19]`
    );

    {
      const cmd = command(
        'submodule add [abc [def]'
      ) as unknown as InternalCommand;
      cmd._resolve();
      expect(cmd._arguments).toMatchInlineSnapshot(`
        [
          {
            "init": {},
            "name": "abc [def",
            "spec": "",
            "type": "optional",
          },
        ]
      `);
    }

    await expect(async () => {
      const cmd = command(
        'submodule [def] add [...abc]'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Sub-command should be placed in the beginning at the command "submodule [def] add [...abc]", position 16]`
    );
  });

  it('should find invalid spread arguments', async () => {
    await expect(async () => {
      const cmd = command('submodule add [...') as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid spread argument at the command "submodule add [...", position 18]`
    );

    await expect(async () => {
      const cmd = command(
        'submodule add [... <abc>'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid spread argument at the command "submodule add [... <abc>", position 24]`
    );

    await expect(async () => {
      const cmd = command(
        'submodule add [...rest <abc>'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid spread argument at the command "submodule add [...rest <abc>", position 28]`
    );

    await expect(async () => {
      const cmd = command(
        'submodule add [...rest]def <abc>'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid spread argument at the command "submodule add [...rest]def <abc>", position 23]`
    );

    await expect(async () => {
      const cmd = command(
        'submodule add [...rest] [abc]'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Optional argument should be placed before spread arguments at the command "submodule add [...rest] [abc]", position 25]`
    );

    await expect(async () => {
      const cmd = command(
        'submodule add [...rest1] [...rest2]'
      ) as unknown as InternalCommand;
      cmd._resolve();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Spread argument can only appear once at the command "submodule add [...rest1] [...rest2]", position 26]`
    );
  });
});

// TODO: test alias command resolve, test manual added arguments
