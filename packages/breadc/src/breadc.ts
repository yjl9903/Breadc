import type { Breadc, AppOption, Command, Option } from './types';

import { makePluginContainer } from './plugin';
import { makeTreeNode, parse } from './parser';
import { initContextOptions, makeOption } from './option';
import { makeCommand, makeHelpCommand, makeVersionCommand } from './command';

export function breadc(name: string, config: AppOption = {}) {
  let defaultCommand: Command | undefined = undefined;
  const allCommands: Command[] = [];
  const globalOptions: Option[] = [];
  const container = makePluginContainer(config.plugins);

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
    option(format, _config, _config2: any = {}) {
      const config =
        typeof _config === 'string'
          ? { description: _config, ..._config2 }
          : _config;
      const option = makeOption(format, config);
      globalOptions.push(option);
      return breadc;
    },
    command(text, _config = {}) {
      const config =
        typeof _config === 'string' ? { description: _config } : _config;

      const command = makeCommand(text, config, root, container);

      if (command._default) {
        defaultCommand = command;
      }

      allCommands.push(command);
      return command;
    },
    parse(args: string[]) {
      const result = parse(root, args);
      return result;
    },
    async run(args: string[]) {
      const result = breadc.parse(args);
      const command = result.command;
      if (command) {
        if (command.callback) {
          await container.preRun(breadc);
          const r = await command.callback(result);
          await container.postRun(breadc);
          return r;
        }
      }
      return undefined as any;
    }
  };

  return breadc;
}
