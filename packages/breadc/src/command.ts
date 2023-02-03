import { bold } from '@breadc/color';

import type {
  AppOption,
  Command,
  CommandOption,
  Argument,
  Option
} from './types';

import { twoColumn } from './utils';
import { ParseError } from './error';
import { makeOption, initContextOptions } from './option';
import { TreeNode, makeTreeNode, Context } from './parser';

export function makeCommand<F extends string = string>(
  format: F,
  config: CommandOption,
  root: TreeNode
): Command {
  let cursor = root;

  const args: Argument[] = [];
  const options: Option[] = [];

  const command: Command = {
    callback: undefined,
    format,
    description: config.description ?? '',
    _arguments: args,
    _options: options,
    option(format, _config, _config2: any = {}) {
      const config =
        typeof _config === 'string'
          ? { description: _config, ..._config2 }
          : _config;
      const option = makeOption(format, config);
      options.push(option);
      return command;
    },
    action(fn) {
      command.callback = fn;
    }
  };

  const node = makeTreeNode({
    command,
    init(context) {
      initContextOptions(options, context);
    },
    finish(context) {
      const rest = context.result['--'];
      for (let i = 0; i < args.length; i++) {
        if (args[i].type === 'const') {
          if (rest[i] !== args[i].name) {
            throw new ParseError(`Internal`);
          }
        } else if (args[i].type === 'require') {
          if (i >= rest.length) {
            throw new ParseError(`You must provide require argument`);
          }
          context.result.arguments.push(rest[i]);
        } else if (args[i].type === 'optional') {
          context.result.arguments.push(rest[i]);
        } else if (args[i].type === 'rest') {
          context.result.arguments.push(rest.splice(i));
        }
      }
      context.result['--'] = rest.splice(args.length);
    }
  });

  {
    // 0 -> aaa bbb
    // 1 -> aaa bbb <xxx> <yyy>
    // 2 -> aaa bbb <xxx> <yyy> [zzz]
    // 3 -> bbb bbb <xxx> <yyy> [...www]
    let state = 0;
    for (let i = 0; i < format.length; i++) {
      if (format[i] === '<') {
        if (state !== 0 && state !== 1) {
          // error here
        }

        const start = i;
        while (i < format.length && format[i] !== '>') {
          i++;
        }

        const name = format.slice(start + 1, i);
        state = 1;
        args.push({ type: 'require', name });
      } else if (format[i] === '[') {
        if (state !== 0 && state !== 1) {
          // error here
        }

        const start = i;
        while (i < format.length && format[i] !== ']') {
          i++;
        }

        const name = format.slice(start + 1, i);
        state = 2;
        if (name.startsWith('...')) {
          args.push({ type: 'rest', name });
        } else {
          args.push({ type: 'optional', name });
        }
      } else if (format[i] !== ' ') {
        if (state !== 0) {
          // error here
        }

        const start = i;
        while (i < format.length && format[i] !== ' ') {
          i++;
        }
        const name = format.slice(start, i);

        if (cursor.children.has(name)) {
          cursor = cursor.children.get(name)!;
        } else {
          const internalNode = makeTreeNode({
            next(token, context) {
              const t = token.raw();
              context.result['--'].push(t);
              if (internalNode.children.has(t)) {
                const next = internalNode.children.get(t)!;
                next.init(context);
                return next;
              } else {
                throw new ParseError(`Unknown sub-command ${t}`);
              }
            },
            finish() {
              throw new ParseError(`Unknown sub-command`);
            }
          });

          cursor.children.set(name, internalNode);
          cursor = internalNode;
        }

        state = 0;
        args.push({ type: 'const', name });
      }
    }

    cursor.command = command;
    if (cursor !== root) {
      for (const [key, value] of cursor.children) {
        node.children.set(key, value);
      }
      cursor.children = node.children;
      cursor.next = node.next;
      cursor.init = node.init;
      cursor.finish = node.finish;
    } else {
      cursor.finish = node.finish;
    }
  }

  return command;
}

export function makeVersionCommand(name: string, config: AppOption): Option {
  const command: Command = {
    callback() {
      const text = `${name}/${config.version ? config.version : 'unknown'}`;
      console.log(text);
      return text;
    },
    format: '-v, --version',
    description: 'Print version',
    _arguments: [],
    _options: [],
    option() {
      return command;
    },
    action() {}
  };

  const node = makeTreeNode({
    command,
    next() {
      return false;
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
    action() {
      return node;
    }
  };

  return option;
}

type HelpBlcok = string | Array<[string, string]>;
type HelpMessage = Array<HelpBlcok | (() => HelpBlcok[] | undefined)>;

export function makeHelpCommand(name: string, config: AppOption): Option {
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
    const commands: Command[] = cursor.command ? [cursor.command] : [];
    const q = [cursor];
    visited.add(cursor);

    for (let i = 0; i < q.length; i++) {
      const cur = q[i];
      for (const [_key, cmd] of cur.children) {
        if (!visited.has(cmd)) {
          visited.add(cmd);
          if (cmd.command) {
            commands.push(cmd.command);
          }
          q.push(cmd);
        }
      }
    }

    return commands;
  }

  function reorderHelpVersion(options: Option[]) {
    const result: Option[] = [];
    for (const op of options) {
      if (op.name === 'help') {
      } else if (op.name === 'version') {
      } else {
        result.push(option);
      }
    }
    return result;
  }

  const command: Command = {
    callback(option) {
      // @ts-ignore
      const context: Context = option.__context__;
      // @ts-ignore
      const cursor: TreeNode = option.__cursor__;

      const output: HelpMessage = [
        `${name}/${config.version ? config.version : 'unknown'}`,
        () => {
          if (config.description) {
            return ['', config.description];
          } else {
            return undefined;
          }
        },
        () => {
          const cmds = expandCommands(cursor);
          if (cmds.length > 0) {
            return [
              '',
              'Commands:',
              cmds.map((cmd) => [
                `  ${name} ${bold(cmd.format)}`,
                cmd.description
              ])
            ];
          } else {
            return undefined;
          }
        },
        '',
        'Options:',
        [...context.options.entries()]
          .filter(([key, op]) => key === op.name)
          .sort((lhs, rhs) => lhs[1].order - rhs[1].order)
          .map(([_key, op]) => [
            '  ' + (!op.short ? '    ' : '') + bold(op.format),
            op.description
          ]),
        ''
      ];
      // console.log(cursor);
      // console.log(context);

      const text = expandMessage(output).join('\n');
      console.log(text);

      return text;
    },
    format: '-h, --help',
    description: 'Print help',
    _arguments: [],
    _options: [],
    option() {
      return command;
    },
    action() {}
  };

  const node = makeTreeNode({
    command,
    next() {
      return false;
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
    action(cursor, _token, context) {
      // @ts-ignore
      context.result.options.__cursor__ = cursor;
      // @ts-ignore
      context.result.options.__context__ = context;
      return node;
    }
  };

  return option;
}
