import { run as doRun } from '../runtime/run.ts';
import { parse as doParse } from '../runtime/parser.ts';

import type {
  Breadc,
  BreadcInit,
  InternalBreadc,
  ActionMiddleware,
  UnknownOptionMiddleware,
  Option,
  OptionInit,
  InternalOption,
  InferOptionInitialType,
  GroupInit,
  InternalGroup,
  Command,
  CommandInit,
  InternalCommand
} from './types/index.ts';

import { group as makeGroup } from './group.ts';
import { option as makeOption } from './option.ts';
import { command as makeCommand } from './command.ts';

export function breadc(name: string, init: BreadcInit = {}): Breadc {
  const commands: (InternalGroup | InternalCommand)[] = [];
  const options: InternalOption[] = [];
  const actionMiddlewares: ActionMiddleware<any, any>[] = [];
  const unknownOptionMiddlewares: UnknownOptionMiddleware<any>[] = [];

  const app = <InternalBreadc>{
    name,
    version: init.version,

    // internal
    _init: init,
    _commands: commands,
    _options: options,
    _actionMiddlewares: actionMiddlewares,
    _unknownOptionMiddlewares: unknownOptionMiddlewares,

    option<
      Spec extends string,
      Initial extends InferOptionInitialType<Spec>,
      Init extends OptionInit<Spec, Initial, unknown>
    >(spec: Spec | Option<Spec>, description?: string, init?: Init) {
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
      return app;
    },

    group<S extends string, I extends GroupInit<S>>(spec: S, init?: I) {
      const group = typeof spec === 'string' ? makeGroup(spec, init) : spec;
      commands.push(group as unknown as InternalGroup);
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
      commands.push(command as unknown as InternalCommand);
      return command;
    },

    use<Return, Middleware extends ActionMiddleware<{}, Return>>(
      middleware: Middleware
    ) {
      actionMiddlewares.push(middleware);
      return app;
    },

    allowUnknownOptions(middleware?: boolean | UnknownOptionMiddleware<{}>) {
      if (typeof middleware === 'function') {
        unknownOptionMiddlewares.push(middleware);
      } else if (middleware) {
        unknownOptionMiddlewares.push(() => true);
      }
      return app;
    },

    parse(args: string[]) {
      return doParse(app, args);
    },

    async run(args: string[]) {
      return doRun(app, args);
    }
  };

  return app as unknown as Breadc<{}, {}>;
}
