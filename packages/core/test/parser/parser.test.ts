import { describe, it, expect } from 'vitest';

import { parse } from '../../src/parser/parser.ts';
import { Context } from '../../src/parser/context.ts';
import { Command, makeCommand } from '../../src/breadc/command.ts';

describe('parser', () => {
  it('should parse default cli and empty args', () => {
    const context = new Context(
      { globalOptions: [], commands: [makeCommand(new Command(''))] },
      []
    );
    parse(context);

    expect(context).toMatchInlineSnapshot(`
      Context {
        "arguments": [],
        "command": {
          "command": Command {
            "actionFn": undefined,
            "config": {},
            "format": "",
            "options": [],
          },
          "isDefault": [Function],
          "optionals": undefined,
          "pieces": [],
          "required": undefined,
          "resolve": [Function],
          "resolveSubCommand": [Function],
          "spread": undefined,
        },
        "container": {
          "commands": [
            {
              "command": Command {
                "actionFn": undefined,
                "config": {},
                "format": "",
                "options": [],
              },
              "isDefault": [Function],
              "optionals": undefined,
              "pieces": [],
              "required": undefined,
              "resolve": [Function],
              "resolveSubCommand": [Function],
              "spread": undefined,
            },
          ],
          "globalOptions": [],
        },
        "matching": {
          "commands": Map {},
          "options": Map {},
          "unknown": [],
        },
        "metadata": {},
        "options": Map {},
        "remaining": [],
        "tokens": Lexer {
          "args": [],
          "cursor": 0,
        },
      }
    `);
  });
});
