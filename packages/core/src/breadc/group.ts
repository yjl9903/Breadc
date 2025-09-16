import type {
  GroupInit,
  OptionInit,
  CommandInit,
  Group,
  Option,
  Command,
  InternalGroup,
  InternalOption,
  InternalCommand,
  ActionMiddleware,
  UnknownOptionMiddleware
} from './types/index.ts';
import { option as makeOption } from './option.ts';
import { command as makeCommand } from './command.ts';

export function group<S extends string, I extends GroupInit<S>>(
  spec: S,
  init?: I
): Group<S, I, {}, {}> {
  const commands: InternalCommand[] = [];
  const options: InternalOption[] = [];
  const actionMiddlewares: ActionMiddleware<any, any>[] = [];
  const unknownOptionMiddlewares: UnknownOptionMiddleware<any>[] = [];

  return (<InternalGroup>{
    spec,
    init,
    commands,
    options,
    actionMiddlewares,
    unknownOptionMiddlewares,
    option<S extends string, I extends OptionInit<S>>(
      spec: S | Option<S>,
      init?: I
    ) {
      const option = typeof spec === 'string' ? makeOption(spec, init) : spec;
      options.push(option);
      return this;
    },
    command<S extends string, I extends CommandInit<S>>(
      spec: S | Command<S>,
      init?: I
    ) {
      const command = typeof spec === 'string' ? makeCommand(spec, init) : spec;
      commands.push(command as unknown as InternalCommand);
      return command;
    },
    use<MR extends Record<never, never>>(
      middleware: ActionMiddleware<any, MR>
    ) {
      actionMiddlewares.push(middleware);
      return this as any;
    },
    allowUnknownOptions(middleware?: boolean | UnknownOptionMiddleware<any>) {
      return this;
    }
  }) as any;
}
