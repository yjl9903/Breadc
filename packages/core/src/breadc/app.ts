import { parse as doParse, resolveArgs, resolveOptions } from '../runtime/parser.ts';
import { run as doRun } from '../runtime/run.ts';

import type {
  Breadc,
  BreadcInit,
  InternalBreadc,
  ActionMiddleware,
  UnknownCommandMiddleware,
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
  const unknownCommandMiddlewares: UnknownCommandMiddleware<any>[] = [];
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
    _unknownCommandMiddlewares: unknownCommandMiddlewares,

    option<
      Spec extends string,
      Initial extends InferOptionInitialType<Spec>,
      Init extends OptionInit<Spec, Initial, unknown>
    >(spec: Spec | Option<Spec>, description?: string, init?: Init) {
      const option =
        typeof spec === 'string'
          ? makeOption(spec, description, init as unknown as OptionInit<Spec, InferOptionInitialType<Spec>, unknown>)
          : spec;
      options.push(option as unknown as InternalOption);
      return app;
    },

    group<S extends string, I extends GroupInit<S>>(spec: S, init?: I) {
      const group = typeof spec === 'string' ? makeGroup(spec, init) : spec;
      commands.push(group as unknown as InternalGroup);
      return group;
    },

    command<S extends string, I extends CommandInit<S>>(spec: S | Command<S>, description?: string, init?: I) {
      const command =
        typeof spec === 'string' ? makeCommand(spec, description || init ? { description, ...init } : undefined) : spec;
      commands.push(command as unknown as InternalCommand);
      return command;
    },

    use<Middleware extends ActionMiddleware<{}>>(middleware: Middleware) {
      actionMiddlewares.push(middleware);
      return app;
    },

    onUnknownCommand(middleware: UnknownCommandMiddleware<{}>) {
      unknownCommandMiddlewares.push(middleware);
      return app;
    },

    allowUnknownOption(middleware?: boolean | UnknownOptionMiddleware<{}>) {
      if (typeof middleware === 'function') {
        unknownOptionMiddlewares.push(middleware);
      } else if (middleware) {
        unknownOptionMiddlewares.push((_ctx, key, value) => ({
          name: key,
          value
        }));
      }
      return app;
    },

    parse(argv: string[]) {
      const context = doParse(app, argv);
      const args = resolveArgs(context);
      const options = resolveOptions(context);

      return {
        args,
        options,
        '--': context.remaining,
        context
      };
    },

    async run(argv: string[]) {
      return doRun(app, argv);
    }
  };

  return app as unknown as Breadc<{}, {}>;
}
