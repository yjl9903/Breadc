import type {
  Breadc,
  BreadcInit,
  BreadcInstance,
  InternalBreadc,
  ActionMiddleware,
  UnknownOptionMiddleware,
  GroupInit,
  InternalGroup,
  Option,
  OptionInit,
  Command,
  CommandInit,
  InternalCommand
} from './types/index.ts';

import { group as makeGroup } from './group.ts';
import { option as makeOption } from './option.ts';
import { command as makeCommand } from './command.ts';

export function breadc<Data extends Record<never, never>>(
  name: string,
  init: BreadcInit = {}
): Breadc<Data, {}> {
  const instance: BreadcInstance = {
    name,
    init,
    commands: [],
    options: [],
    actionMiddlewares: [],
    unknownOptionMiddlewares: []
  };

  return (<InternalBreadc<{}>>{
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
      instance.commands.push(group as unknown as InternalGroup);
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

    use<MR extends Record<never, never>>(
      middleware: ActionMiddleware<any, MR>
    ) {
      instance.actionMiddlewares.push(middleware);
      return this;
    },

    allowUnknownOptions(middleware?: boolean | UnknownOptionMiddleware<any>) {
      if (typeof middleware === 'function') {
        instance.unknownOptionMiddlewares.push(middleware);
      } else if (middleware) {
        // TODO: handle
        instance.unknownOptionMiddlewares.push(() => true);
      }
      return this;
    },

    parse(args: string[]) {
      return undefined as any;
    },

    async run<T>(args: string[]) {
      return undefined as T;
    }
  }) as any;
}
