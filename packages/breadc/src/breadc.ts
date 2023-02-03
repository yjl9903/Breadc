import type { Breadc, AppOption, Command, Option } from './types';

import { makeCommand, makeHelpCommand, makeVersionCommand } from './command';
import { makeTreeNode, parse } from './parser';
import { initContextOptions, makeOption } from './option';

export function breadc(name: string, config: AppOption = {}) {
  let defaultCommand: Command | undefined = undefined;
  const allCommands: Command[] = [];
  const globalOptions: Option[] = [
    makeVersionCommand(name, config),
    makeHelpCommand(name, config)
  ];

  const root = makeTreeNode({
    init(context) {
      initContextOptions(globalOptions, context);
      if (defaultCommand) {
        initContextOptions(defaultCommand._options, context);
      }
    },
    finish() {}
  });

  const breadc: Breadc = {
    option(format, config): Breadc {
      const option = makeOption(format, config);
      globalOptions.push(option);
      return breadc;
    },
    command(text): Command {
      const command = makeCommand(text, root);
      if (
        command._arguments.length === 0 ||
        command._arguments[0].type !== 'const'
      ) {
        defaultCommand = command;
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
