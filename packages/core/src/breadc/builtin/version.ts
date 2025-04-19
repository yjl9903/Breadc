import type { BreadcInit } from '../app.ts';

import { Command, makeCommand } from '../command.ts';

export function makeVersionCommand(name: string, config: BreadcInit) {
  const raw = config.builtin?.version?.format;

  const command = new Command('', { description: 'Print version' });
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
