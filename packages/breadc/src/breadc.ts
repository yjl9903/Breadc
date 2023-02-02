import type { Breadc, AppOption, Command, Argument, Option } from './types';

import { ParseError } from './error';
import { makeOption } from './option';
import { Context, makeTreeNode, parse } from './parser';

export function breadc(name: string, config: AppOption = {}) {
  const allCommands: Command[] = [];
  const globalOptions: Option[] = [];

  const initContextOptions = (options: Option[], context: Context) => {
    for (const option of options) {
      const defaultValue =
        option.type === 'boolean'
          ? false
          : option.type === 'string'
          ? option.default ?? ''
          : false;
      context.options.set(option.name, option);
      if (option.short) {
        context.options.set(option.short, option);
      }
      context.result.options[option.name] = defaultValue;
    }
  };

  const root = makeTreeNode({
    init(context) {
      initContextOptions(globalOptions, context);
    },
    finish() {}
  });

  const breadc: Breadc = {
    option(text): Breadc {
      const option = makeOption(text);
      globalOptions.push(option);
      return breadc;
    },
    command(text): Command {
      let cursor = root;

      const args: Argument[] = [];
      const options: Option[] = [];

      const command: Command = {
        callback: undefined,
        description: '',
        arguments: args,
        option(text) {
          const option = makeOption(text);
          options.push(option);
          return command;
        },
        action(fn) {
          command.callback = fn;
          if (cursor === root) {
            globalOptions.push(...options);
          }
          return breadc;
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
        for (let i = 0; i < text.length; i++) {
          if (text[i] === '<') {
            if (state !== 0 && state !== 1) {
              // error here
            }

            const start = i;
            while (i < text.length && text[i] !== '>') {
              i++;
            }

            const name = text.slice(start + 1, i);
            state = 1;
            args.push({ type: 'require', name });
          } else if (text[i] === '[') {
            if (state !== 0 && state !== 1) {
              // error here
            }

            const start = i;
            while (i < text.length && text[i] !== ']') {
              i++;
            }

            const name = text.slice(start + 1, i);
            state = 2;
            if (name.startsWith('...')) {
              args.push({ type: 'rest', name });
            } else {
              args.push({ type: 'optional', name });
            }
          } else if (text[i] !== ' ') {
            if (state !== 0) {
              // error here
            }

            const start = i;
            while (i < text.length && text[i] !== ' ') {
              i++;
            }
            const name = text.slice(start, i);

            if (cursor.children.has(name)) {
              cursor = cursor.children.get(name)!;
              // console.log(text);
              // console.log(name);
              // console.log(cursor);
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

      allCommands.push(command);

      return command;
    },
    parse(args: string[]) {
      return parse(root, args);
    },
    async run(args: string[]) {
      const result = parse(root, args);
      const command = result.command;
      if (command) {
        if (command.callback) {
          return command.callback(...result.arguments, {
            ...result.options,
            '--': result['--']
          });
        }
      }
      return undefined as any;
    }
  };

  return breadc;
}
