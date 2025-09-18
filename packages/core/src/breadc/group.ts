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
    option<
      Spec extends string,
      Initial extends InferOptionInitialType<Spec>,
      I extends OptionInit<Spec, Initial>
    >(spec: Spec | Option<Spec>, description?: string, init?: I) {
      const option =
        typeof spec === 'string'
          ? makeOption(
              spec,
              description,
              init as unknown as OptionInit<
                Spec,
                InferOptionInitialType<Spec>,
                unknown
              >
            )
          : spec;
      options.push(option as unknown as InternalOption);
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
  }) as unknown as Group<S, I, {}, {}>;
}
