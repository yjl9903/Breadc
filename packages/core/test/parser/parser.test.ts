import { describe, it, expect } from 'vitest';

import { parse } from '../../src/parser/parser.ts';
import { Context } from '../../src/parser/context.ts';
import { Command } from '../../src/breadc/command.ts';

describe('parser', () => {
  it('should parse default cli and empty args', () => {
    const context = new Context(
      { globalOptions: [], commands: [new Command('')] },
      []
    );
    parse(context);

    expect(context).toMatchInlineSnapshot(`
      Context {
        "arguments": [],
        "command": Command {
          "actionFn": undefined,
          "format": "",
          "optionals": undefined,
          "options": [],
          "pieces": [],
          "required": undefined,
          "resolved": [
            1,
            0,
          ],
          "spread": undefined,
        },
        "container": {
          "commands": [
            Command {
              "actionFn": undefined,
              "format": "",
              "optionals": undefined,
              "options": [],
              "pieces": [],
              "required": undefined,
              "resolved": [
                1,
                0,
              ],
              "spread": undefined,
            },
          ],
          "globalOptions": [],
        },
        "lexer": Lexer {
          "args": [],
          "cursor": 0,
        },
        "matching": {
          "commands": Map {},
          "options": Map {},
          "unknown": [],
        },
        "options": Map {},
        "remaining": [],
      }
    `);
  });
});
