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

import { option as makeOption } from './option.ts';
import { command as makeCommand } from './command.ts';

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

    _resolve: () => {
      if (group._pieces) return;

      const pieces: string[] = [];
      for (let i = 0; i < spec.length; ) {
        if (spec[i] === '<' || spec[i] === '[') {
          throw new ResolveGroupError(ResolveGroupError.INVALID_ARG_IN_GROUP, {
            spec,
            position: i
          });
        } else if (spec[i] === ' ') {
          while (i < spec.length && spec[i] === ' ') {
            i++;
          }
        } else {
          let j = i;
          while (j < spec.length && spec[j] !== ' ') {
            j++;
          }
          pieces.push(spec.slice(i, j));
          i = j;
        }
      }

      group._pieces = [pieces];
    },

    option<Spec extends string, Initial extends InferOptionInitialType<Spec>, I extends OptionInit<Spec, Initial>>(
      spec: Spec | Option<Spec>,
      description?: string,
      init?: I
    ) {
      const option =
        typeof spec === 'string'
          ? makeOption(spec, description, init as unknown as OptionInit<Spec, InferOptionInitialType<Spec>, unknown>)
          : spec;
      options.push(option as unknown as InternalOption);
      return group;
    },

    command<S extends string, I extends CommandInit<S>>(spec: S | Command<S>, init?: I) {
      const command = typeof spec === 'string' ? makeCommand(spec, init) : spec;
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
        unknownOptionMiddlewares.push((_ctx, key, value) => ({
          name: key,
          value
        }));
      }
      return group;
    }
  };

  return group as unknown as Group<S, I, {}, {}>;
}
