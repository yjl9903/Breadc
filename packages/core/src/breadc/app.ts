import { parse as doParse, finalizeInput, resolveArgs, resolveOptions } from '../runtime/parser.ts';
import { run as doRun } from '../runtime/run.ts';

import type {
  CommandDescription,
  Breadc,
  BreadcInit,
  InternalBreadc,
  ActionMiddleware,
  UnknownCommandHandler,
  UnknownOptionHandler,
  Option,
  OptionInit,
  InternalOption,
  Group,
  GroupInit,
  InternalGroup,
  Command,
  CommandInit,
  InternalCommand
} from './types/index.ts';

import { group as makeGroup } from './group.ts';
import { command as makeCommand } from './command.ts';
import { defaultUnknownOptionHandler, resolveOptionInput } from './shared.ts';

export function breadc(name: string, init: BreadcInit = {}): Breadc {
  const commands: (InternalGroup | InternalCommand)[] = [];
  const options: InternalOption[] = [];
  const actionMiddlewares: ActionMiddleware<any, any>[] = [];
  const unknownCommandHandlers: UnknownCommandHandler<any>[] = [];
  const unknownOptionHandlers: UnknownOptionHandler<any>[] = [];

  const app = <InternalBreadc>{
    name,
    version: init.version,

    // internal
    _init: init,
    _commands: commands,
    _options: options,
    _actionMiddlewares: actionMiddlewares,
    _unknownOptionHandlers: unknownOptionHandlers,
    _unknownCommandHandlers: unknownCommandHandlers,

    option<Spec extends string, Init extends OptionInit<Spec>>(
      spec: Spec | Option<Spec>,
      description?: string,
      init?: Init
    ) {
      options.push(resolveOptionInput(spec, description, init));
      return app;
    },

    group<S extends string, I extends GroupInit<S>>(spec: S | Group<S>, description?: CommandDescription, init?: I) {
      const group = typeof spec === 'string' ? makeGroup(spec, description, init) : spec;
      commands.push(group as unknown as InternalGroup);
      return group;
    },

    command<S extends string, I extends CommandInit<S>>(
      spec: S | Command<S>,
      description?: CommandDescription,
      init?: I
    ) {
      const command = typeof spec === 'string' ? makeCommand(spec, description, init) : spec;
      commands.push(command as unknown as InternalCommand);
      return command;
    },

    use<Middleware extends ActionMiddleware<{}>>(middleware: Middleware) {
      actionMiddlewares.push(middleware);
      return app;
    },

    onUnknownCommand(handler: UnknownCommandHandler<{}>) {
      unknownCommandHandlers.push(handler);
      return app;
    },

    allowUnknownOption(handler?: UnknownOptionHandler<{}>) {
      if (typeof handler === 'function') {
        unknownOptionHandlers.push(handler);
      } else {
        unknownOptionHandlers.push(defaultUnknownOptionHandler);
      }
      return app;
    },

    parse(argv: string[]) {
      const context = doParse(app, argv);
      finalizeInput(context);

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
      return doRun(doParse(app, argv));
    }
  };

  return app as unknown as Breadc<{}, {}>;
}
