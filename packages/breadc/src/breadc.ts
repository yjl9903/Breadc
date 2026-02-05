import type { Breadc, AppOption, Command, Option } from './types/index.ts';

import { makeCommand } from './command.ts';
import { makePluginContainer } from './plugin.ts';
import { makeTreeNode, parse } from './parser/index.ts';
import { initContextOptions, makeOption } from './option.ts';
import { makeHelpCommand, makeVersionCommand } from './builtin.ts';

export function breadc(name: string, config: AppOption = {}) {
  let defaultCommand: Command | undefined = undefined;
  const allCommands: Command[] = [];
  const globalOptions: Option[] = [];

  if (config.builtin?.help !== false) {
    globalOptions.push(makeHelpCommand(name, config, allCommands));
  }
  if (config.builtin?.version !== false) {
    globalOptions.push(makeVersionCommand(name, config));
  }

  const container = makePluginContainer(config.plugins);

  const root = makeTreeNode({
    init(context) {
      initContextOptions(globalOptions, context);
      if (defaultCommand) {
        initContextOptions(defaultCommand._options, context);
      }
    }
  });

  const breadc: Breadc = {
    name,
    description: config.description ?? '',
    option(format, _config, _config2: any = {}) {
      const config = typeof _config === 'string' ? { description: _config, ..._config2 } : _config;
      const option = makeOption(format, config);
      globalOptions.push(option);
      return breadc as Breadc<any>;
    },
    command(text, _config = {}, _config2: any = {}) {
      const config = typeof _config === 'string' ? { description: _config, ..._config2 } : _config;

      const command = makeCommand(text, config, root, container);

      if (command._default) {
        defaultCommand = command;
      }

      allCommands.push(command);
      return command;
    },
    parse(args: string[]) {
      return parse(root, args);
    },
    async run(args: string[]) {
      const result = breadc.parse(args);
      const callback = result.callback;
      if (callback) {
        await container.preRun(breadc);
        const r = await callback(result);
        await container.postRun(breadc);
        return r;
      }
      return undefined as any;
    }
  };

  container.init(breadc, allCommands, globalOptions);

  return breadc;
}
