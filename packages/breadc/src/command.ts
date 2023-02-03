import { AppOption } from './types/breadc';
import type { Command, Argument, Option } from './types';

import { ParseError } from './error';
import { TreeNode, makeTreeNode } from './parser';
import { makeOption, initContextOptions } from './option';

export function makeCommand<F extends string = string>(
  format: F,
  root: TreeNode
): Command {
  let cursor = root;

  const args: Argument[] = [];
  const options: Option[] = [];

  const command: Command = {
    callback: undefined,
    description: '',
    _arguments: args,
    _options: options,
    option(format, config) {
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
    description: 'Print version',
    action() {
      return node;
    }
  };

  return option;
}

export function makeHelpCommand(name: string, config: AppOption): Option {
  const command: Command = {
    callback() {},
    description: '',
    _arguments: [],
    _options: [],
    option() {
      return command;
    },
    action() {}
  };

  const node = makeTreeNode({
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
    action() {
      return node;
    }
  };

  return option;
}
