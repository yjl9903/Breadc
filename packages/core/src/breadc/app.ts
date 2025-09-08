import type {
  Breadc,
  BreadcInit,
  BreadcInstance,
  Command,
  CommandInit,
  GroupInit,
  InternalBreadc,
  InternalCommand,
  Option,
  OptionInit
} from './types/index.ts';

import { group as makeGroup } from './group.ts';
import { option as makeOption } from './option.ts';
import { command as makeCommand } from './command.ts';

export function breadc(name: string, init: BreadcInit = {}): Breadc<{}, {}> {
  const instance: BreadcInstance = {
    name,
    init,
    commands: [],
    options: []
  };

  return <InternalBreadc<{}>>{
    name,
    version: init.version,
    instance,

    option<S extends string, I extends OptionInit<S>>(
      spec: S | Option<S>,
      description?: string,
      init?: I
    ) {
      const option =
        typeof spec === 'string'
          ? makeOption(
              spec,
              description || init ? { description, ...init } : undefined
            )
          : spec;
      instance.options.push(option);
      return this;
    },

    group<S extends string, I extends GroupInit<S>>(spec: S, init?: I) {
      const group = typeof spec === 'string' ? makeGroup(spec, init) : spec;
      return group;
    },

    command<S extends string, I extends CommandInit<S>>(
      spec: S | Command<S>,
      description?: string,
      init?: I
    ) {
      const command =
        typeof spec === 'string'
          ? makeCommand(
              spec,
              description || init ? { description, ...init } : undefined
            )
          : spec;
      instance.commands.push(command as unknown as InternalCommand);
      return command;
    },

    use() {
      return this;
    },

    allowUnknownOptions() {
      return this;
    },

    parse(args: string[]) {
      return undefined as any;
    },

    async run<T>(args: string[]) {
      return undefined as T;
    }
  };
}
