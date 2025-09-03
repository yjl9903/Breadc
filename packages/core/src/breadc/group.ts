import type {
  GroupInit,
  OptionInit,
  CommandInit,
  Group,
  Option,
  Command
} from './types/index.ts';
import { option as makeOption } from './option.ts';
import { command as makeCommand } from './command.ts';

export function group<S extends string, I extends GroupInit<S>>(
  spec: S,
  init?: I
): Group<S, I, {}> {
  return {
    spec,
    init,
    option<S extends string, I extends OptionInit<S>>(
      spec: S | Option<S>,
      init?: I
    ) {
      const option = typeof spec === 'string' ? makeOption(spec, init) : spec;
      return this;
    },
    command<S extends string, I extends CommandInit<S>>(
      spec: S | Command<S>,
      init?: I
    ) {
      const command = typeof spec === 'string' ? makeCommand(spec, init) : spec;
      return command;
    },
    use() {
      return this;
    },
    allowUnknownOptions() {
      return this;
    }
  };
}
