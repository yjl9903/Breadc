import type { BreadcConfig } from '../app.ts';

import { Command, makeCommand } from '../command.ts';

export function makeVersionCommand(name: string, config: BreadcConfig) {
  const raw = config.builtin?.version?.format;

  const command = new Command('');
  if (raw === undefined) {
    command.aliases.push('-v', '--version');
  } else if (Array.isArray(raw)) {
    command.aliases.push(...raw);
  } else {
    command.aliases.push(raw);
  }

  command.actionFn = () => {
    const text = `${name}/${config.version ? config.version : 'unknown'}`;
    console.log(text);
    return text;
  };

  return makeCommand(command);
}
