import type { BreadcConfig } from '../app.ts';

import { Command, makeCommand } from '../command.ts';

export function makeVersionCommand(name: string, config: BreadcConfig) {
  const raw = config.builtin?.version?.format;

  let command;
  if (raw === undefined) {
    command = new Command('--version').alias('-v');
  } else {
    const formats = Array.isArray(raw) ? raw : [raw];
    command = new Command(formats[0]);
    for (let i = 1; i < formats.length; i++) {
      command.alias(formats[i]);
    }
  }

  command.actionFn = () => {
    const text = `${name}/${config.version ? config.version : 'unknown'}`;
    console.log(text);
    return text;
  };

  return makeCommand(command);
}
