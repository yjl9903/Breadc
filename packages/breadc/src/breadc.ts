import type { Breadc, AppOption, Command, Option } from './types';

import { makeTreeNode, parse } from './parser';
import { initContextOptions, makeOption } from './option';
import { makeCommand, makeHelpCommand, makeVersionCommand } from './command';

export function breadc(name: string, config: AppOption = {}) {
  let defaultCommand: Command | undefined = undefined;
  const allCommands: Command[] = [];
  const globalOptions: Option[] = [];

  const root = makeTreeNode({
    init(context) {
      initContextOptions(globalOptions, context);
      if (defaultCommand) {
        initContextOptions(defaultCommand._options, context);
      }
      initContextOptions(
        [makeHelpCommand(name, config), makeVersionCommand(name, config)],
        context
      );
    },
    finish() {}
  });

  const breadc: Breadc = {
    option(format, config): Breadc {
      const option = makeOption(format, config);
      globalOptions.push(option);
      return breadc;
    },
    command(text, _config = {}): Command {
      const config =
        typeof _config === 'string' ? { description: _config } : _config;

      const command = makeCommand(text, config, root);

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
