import { bold, underline } from '@breadc/color';

import { twoColumn } from './utils';
import { makeTreeNode, TreeNode } from './parser';
import { AppOption, Command, Option } from './types';

export function makeVersionCommand(name: string, config: AppOption): Option {
  const node = makeTreeNode({
    next() {
      return false;
    },
    finish() {
      return () => {
        const text = `${name}/${config.version ? config.version : 'unknown'}`;
        console.log(text);
        return text;
      };
    }
  });

  const option: Option = {
    format: '-v, --version',
    name: 'version',
    short: 'v',
    type: 'boolean',
    initial: undefined,
    order: 999999999 + 1,
    description: 'Print version',
    parse() {
      return node;
    }
  };

  return option;
}

type HelpBlcok = string | Array<[string, string]>;
type HelpMessage = Array<HelpBlcok | (() => HelpBlcok[] | undefined)>;

export function makeHelpCommand(
  name: string,
  config: AppOption,
  allCommands: Command[]
): Option {
  function expandMessage(message: HelpMessage) {
    const result: string[] = [];
    for (const row of message) {
      if (typeof row === 'function') {
        const r = row();
        if (r) {
          result.push(...expandMessage(r));
        }
      } else if (typeof row === 'string') {
        result.push(row);
      } else if (Array.isArray(row)) {
        const lines = twoColumn(row);
        for (const line of lines) {
          result.push(line);
        }
      }
    }
    return result;
  }

  function expandCommands(cursor: TreeNode) {
    const visited = new WeakSet<TreeNode>();
    const added = new WeakSet<Command>();
    const commands: Command[] = cursor.command ? [cursor.command] : [];
    const q = [cursor];
    visited.add(cursor);

    for (let i = 0; i < q.length; i++) {
      const cur = q[i];
      for (const [_key, cmd] of cur.children) {
        if (!visited.has(cmd)) {
          visited.add(cmd);
          if (cmd.command && !added.has(cmd.command)) {
            added.add(cmd.command);
            commands.push(cmd.command);
          }
          q.push(cmd);
        }
      }
    }

    const alias = new Map<string, Command>();
    for (const cmd of commands) {
      if (!alias.has(cmd.format)) {
        alias.set(cmd.format, cmd);
      }
    }

    return [...alias.values()];
  }

  const node = makeTreeNode({
    next() {
      return false;
    },
    finish(context) {
      return () => {
        const cursor: TreeNode = context.meta.__cursor__;

        const usage =
          allCommands.length === 0
            ? `[OPTIONS]`
            : allCommands.length === 1
            ? `[OPTIONS] ${allCommands[0].format}`
            : allCommands.some((c) => c._default)
            ? `[OPTIONS] [COMMAND]`
            : `[OPTIONS] <COMMAND>`;

        const output: HelpMessage = [
          `${name}/${config.version ? config.version : 'unknown'}`,
          () => {
            if (config.description) {
              return ['', config.description];
            } else {
              return undefined;
            }
          },
          '',
          `${bold(underline('Usage:'))} ${bold(name)} ${usage}`,
          () => {
            const cmds = expandCommands(cursor);
            if (cmds.length > 0) {
              return [
                '',
                bold(underline('Commands:')),
                cmds.map((cmd) => [
                  `  ${bold(name)} ${bold(cmd.format)}`,
                  cmd.description
                ])
              ];
            } else {
              return undefined;
            }
          },
          '',
          bold(underline('Options:')),
          [...context.options.entries()]
            .filter(([key, op]) => key === op.name)
            .sort((lhs, rhs) => lhs[1].order - rhs[1].order)
            .map(([_key, op]) => [
              '  ' + (!op.short ? '    ' : '') + bold(op.format),
              op.description
            ]),
          ''
        ];

        const text = expandMessage(output).join('\n');
        console.log(text);

        return text;
      };
    }
  });

  const option: Option = {
    format: '-h, --help',
    name: 'help',
    short: 'h',
    type: 'boolean',
    initial: undefined,
    description: 'Print help',
    order: 999999999,
    parse(cursor, _token, context) {
      context.meta.__cursor__ = cursor;
      return node;
    }
  };

  return option;
}
