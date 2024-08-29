import type { BreadcConfig } from '../app.ts';

import { Command, makeCommand } from '../command.ts';

export function makeHelpCommand(name: string, config: BreadcConfig) {
  const raw = config.builtin?.help?.format;

  const command = new Command('');
  if (raw === undefined) {
    command.aliases.push('-h', '--help');
  } else if (Array.isArray(raw)) {
    command.aliases.push(...raw);
  } else {
    command.aliases.push(raw);
  }

  command.hook('pre:action', function (context) {
    // Prepare commands
    for (const command of context.container.commands) {
      command.resolve();
      for (let i = 0; i < command.aliases.length; i++) {
        command.resolveAliasSubCommand(i);
      }
    }

    // TODO: print help and support sub-commands
    const text = `${name}/${config.version ? config.version : 'unknown'}`;
    console.log(text);

    return text;
  });

  return makeCommand(command);
}
