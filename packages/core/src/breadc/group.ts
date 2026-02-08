import { ResolveGroupError } from '../error.ts';

import type {
  ActionMiddleware,
  UnknownOptionMiddleware,
  Option,
  OptionInit,
  InternalOption,
  InferOptionInitialType,
  Group,
  GroupInit,
  InternalGroup,
  Command,
  CommandInit,
  InternalCommand
} from './types/index.ts';

import { command as makeCommand } from './command.ts';
import { defaultUnknownOptionMiddleware, resolveOptionInput } from './shared.ts';

export function group<S extends string, I extends GroupInit<S>>(spec: S, init?: I): Group<S, I, {}, {}> {
  if (!spec) {
    throw new ResolveGroupError(ResolveGroupError.EMPTY, { spec, position: 0 });
  }

  const commands: InternalCommand[] = [];
  const options: InternalOption[] = [];
  const actionMiddlewares: ActionMiddleware<any, any>[] = [];
  const unknownOptionMiddlewares: UnknownOptionMiddleware<any>[] = [];

  const group: InternalGroup = {
    spec,
    init,

    _pieces: undefined!,
    _commands: commands,
    _options: options,
    _actionMiddlewares: actionMiddlewares,
    _unknownOptionMiddlewares: unknownOptionMiddlewares,

    option<Spec extends string, Initial extends InferOptionInitialType<Spec>, I extends OptionInit<Spec, Initial>>(
      spec: Spec | Option<Spec>,
      description?: string,
      init?: I
    ) {
      options.push(resolveOptionInput(spec, description, init));
      return group;
    },

    command<S extends string, I extends CommandInit<S>>(spec: S | Command<S>, init?: I) {
      const command = typeof spec === 'string' ? makeCommand(spec, init) : spec;
      (command as unknown as InternalCommand)._group = group;
      commands.push(command as unknown as InternalCommand);
      return command;
    },

    use<Middleware extends ActionMiddleware<any, any>>(middleware: Middleware) {
      actionMiddlewares.push(middleware);
      return group;
    },

    allowUnknownOption(middleware?: UnknownOptionMiddleware<any>) {
      if (typeof middleware === 'function') {
        unknownOptionMiddlewares.push(middleware);
      } else {
        unknownOptionMiddlewares.push(defaultUnknownOptionMiddleware());
      }
      return group;
    }
  };

  return group as unknown as Group<S, I, {}, {}>;
}
