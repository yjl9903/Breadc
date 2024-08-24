import type { BreadcConfig } from '../app.ts';

import { Command, makeCommand } from '../command.ts';

export function makeHelpCommand(name: string, config: BreadcConfig) {
  const raw = config.builtin?.help?.format;

  let command;
  if (raw === undefined) {
    command = new Command('--help').alias('-h');
  } else {
    const formats = Array.isArray(raw) ? raw : [raw];
    command = new Command(formats[0]);
    for (let i = 1; i < formats.length; i++) {
      command.alias(formats[i]);
    }
  }

  // TODO: support sub-commands
  command.actionFn = () => {
    const text = `${name}/${config.version ? config.version : 'unknown'}`;
    console.log(text);
    return text;
  };

  return makeCommand(command);
}
