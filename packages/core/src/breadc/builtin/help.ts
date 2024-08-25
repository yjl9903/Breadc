import type { Context } from '../../parser/context.ts';
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

  command.actionFn = function () {
    // Prepare context
    const context = this as unknown as Context;

    // TODO: print help and support sub-commands
    const text = `${name}/${config.version ? config.version : 'unknown'}`;
    console.log(text);

    return text;
  };

  return makeCommand(command);
}
