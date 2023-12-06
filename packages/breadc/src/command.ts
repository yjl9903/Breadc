import type { PluginContainer } from './plugin';
import type { Command, CommandOption, Argument, Option } from './types';

import { ParseError, BreadcError } from './error';
import { makeOption, initContextOptions } from './option';
import { TreeNode, makeTreeNode, Token } from './parser';

export function makeCommand<F extends string = string>(
  format: F,
  config: CommandOption,
  root: TreeNode,
  container: PluginContainer
): Command {
  const args: Argument[] = [];
  const options: Option[] = [];

  const command: Command = {
    callback: undefined,
    format,
    description: config.description ?? '',
    _default: false,
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
    alias(format) {
      const aliasArgs: Argument[] = [];
      const node = makeNode(aliasArgs);

      function* g(): Generator<Argument> {
        for (const f of format.split(' ')) {
          yield { type: 'const', name: f };
        }
        for (const a of args.filter((a) => a.type !== 'const')) {
          yield a;
        }
        return undefined;
      }

      insertTreeNode(aliasArgs, node, g());

      return command;
    },
    action(fn) {
      command.callback = async (parsed) => {
        await container.preCommand(command, parsed);
        // @ts-ignore
        const result = await fn(...parsed.arguments, {
          ...parsed.options,
          '--': parsed['--']
        });
        await container.postCommand(command, parsed);
        return result;
      };
    }
  };

  const node = makeNode(args);

  insertTreeNode(args, node, parseCommandFormat(format));

  return command;

  function makeNode(args: Argument[]) {
    return makeTreeNode({
      command,
      init(context) {
        context.config.allowUnknownOption =
          config.allowUnknownOption ?? 'error';
        initContextOptions(options, context);
      },
      finish(context) {
        const rest = context.result['--'];

        for (let i = 0; i < args.length; i++) {
          if (args[i].type === 'const') {
            if (rest[i] !== args[i].name) {
              /* c8 ignore next 2 */
              throw new ParseError(`Sub-command ${args[i].name} mismatch`);
            }
          } else if (args[i].type === 'require') {
            if (i >= rest.length) {
              throw new ParseError(
                `You must provide require argument ${args[i].name}`
              );
            }
            context.result.arguments.push(rest[i]);
          } else if (args[i].type === 'optional') {
            context.result.arguments.push(rest[i]);
          } else if (args[i].type === 'rest') {
            context.result.arguments.push(rest.splice(i));
          }
        }
        context.result['--'] = rest.splice(args.length);

        return command.callback;
      }
    });
  }

  function insertTreeNode(
    args: Argument[],
    node: TreeNode,
    parsed: Generator<Argument>
  ) {
    let cursor = root;

    for (const arg of parsed) {
      args.push(arg);

      if (arg.type === 'const') {
        const name = arg.name;
        if (cursor.children.has(name)) {
          cursor = cursor.children.get(name)!;
        } else {
          const internalNode = makeTreeNode({
            next(token: Token, context) {
              const t = token.raw();
              context.result['--'].push(t);
              if (internalNode.children.has(t)) {
                const next = internalNode.children.get(t)!;
                next.init(context);
                return next;
              } else {
                throw new ParseError(`Unknown sub-command (${t})`);
              }
            },
            finish() {
              throw new ParseError(`Unknown sub-command`);
            }
          });

          cursor.children.set(name, internalNode);
          cursor = internalNode;
        }
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
      command._default = true;
      cursor.finish = node.finish;
    }
  }
}

function* parseCommandFormat(format: string): Generator<Argument> {
  // 0 -> aaa bbb
  // 1 -> aaa bbb <xxx> <yyy>
  // 2 -> aaa bbb <xxx> <yyy> [zzz]
  // 3 -> bbb bbb <xxx> <yyy> [...www]
  let state = 0;
  for (let i = 0; i < format.length; i++) {
    if (format[i] === '<') {
      if (state !== 0 && state !== 1) {
        throw new BreadcError(
          `Required arguments should be placed before optional or rest arguments`
        );
      }

      const start = i;
      while (i < format.length && format[i] !== '>') {
        i++;
      }

      const name = format.slice(start + 1, i);
      state = 1;
      yield { type: 'require', name };
    } else if (format[i] === '[') {
      if (state !== 0 && state !== 1) {
        throw new BreadcError(
          `There is at most one optional or rest arguments`
        );
      }

      const start = i;
      while (i < format.length && format[i] !== ']') {
        i++;
      }

      const name = format.slice(start + 1, i);
      state = 2;
      if (name.startsWith('...')) {
        yield { type: 'rest', name };
      } else {
        yield { type: 'optional', name };
      }
    } else if (format[i] !== ' ') {
      if (state !== 0) {
        throw new BreadcError(`Sub-command should be placed at the beginning`);
      }

      const start = i;
      while (i < format.length && format[i] !== ' ') {
        i++;
      }
      const name = format.slice(start, i);

      state = 0;
      yield { type: 'const', name };
    }
  }

  return undefined;
}
