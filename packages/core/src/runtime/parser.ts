import type { Breadc, InternalBreadc, InternalOption, InternalGroup, InternalCommand } from '../breadc/index.ts';

import { camelCase } from '../utils/string.ts';
import { rawOption } from '../breadc/option.ts';
import { rawArgument } from '../breadc/command.ts';
import { RuntimeError, BreadcAppError } from '../error.ts';

import { MatchedArgument, MatchedOption } from './matched.ts';
import { type Context, context as makeContext, reset } from './context.ts';
import { buildApp, buildCommand, buildGroup, isGroup } from './builder.ts';
import { buildHelpOption } from '../breadc/builtin/help.ts';
import { buildVersionOption } from '../breadc/builtin/version.ts';

export function parse(app: Breadc, argv: string[]) {
  const context = makeContext<any>(app as InternalBreadc, argv);

  // 1. Prepare root commands
  buildApp(context.breadc);

  // 2. Check whether it only has default command
  const defaultCommands = context.breadc._commands.filter((c) => c._default);
  if (defaultCommands.length >= 2) {
    throw new BreadcAppError(BreadcAppError.DUPLICATED_DEFAULT_COMMAND, {
      context,
      commands: defaultCommands
    });
  }

  const defaultCommand = defaultCommands[0] as unknown as InternalCommand | undefined;
  const onlyDefaultCommand = defaultCommand !== undefined && context.breadc._commands.length === 1;

  // 3. Parse without default command
  doParse(context, onlyDefaultCommand ? defaultCommand : undefined);

  if (context.command || isVersion(context) || isHelp(context)) {
    // 4.1. Parse ok
  } else if (defaultCommand) {
    // 4.2. Parse with default command
    reset(context);
    doParse(context, defaultCommand);
  }

  return context;
}

export function resolveArgs(context: Context<any>) {
  return context.arguments.map((arg) => arg.value());
}

export function resolveOptions(context: Context<any>) {
  const options = Object.fromEntries(
    [...context.options.values()].map((opt) => [camelCase(opt.option.long), opt.value()])
  );
  return options;
}

export function isHelp(context: Context<any>) {
  const help = context.breadc._help;
  if (help && context.options.get(help.long)?.value<boolean>()) {
    return true;
  } else {
    return false;
  }
}

export function isVersion(context: Context<any>) {
  const version = context.breadc._version;
  if (version && context.options.get(version.long)?.value<boolean>()) {
    return true;
  } else {
    return false;
  }
}

function doParse(context: Context, defaultCommand: InternalCommand | undefined) {
  const { breadc, tokens, options: matchedOptions } = context;

  let index = 0;
  let matchedGroup: InternalGroup | undefined = undefined;
  let matchedCommand: InternalCommand | undefined = defaultCommand;

  const pendingCommands: Map<string, Array<[InternalGroup | InternalCommand, number]>> = new Map();
  const pendingLongOptions: Map<string, InternalOption> = new Map();
  const pendingNegateOptions: Map<string, InternalOption> = new Map();
  const pendingShortOptions: Map<string, InternalOption> = new Map();
  const args: string[] = [];
  const unknown: string[] = [];

  const addPendingOptions = (options: InternalOption[]) => {
    for (const option of options) {
      // Add to pending options
      pendingLongOptions.set(option.long, option);
      if (option.type === 'boolean') {
        pendingNegateOptions.set('no-' + option.long, option);
      }
      if (option.short) {
        pendingShortOptions.set(option.short, option);
      }

      // Add to matched options
      matchedOptions.set(option.long, new MatchedOption(option));
    }
  };
  const addPendingCommand = (command: InternalGroup | InternalCommand, alias: number) => {
    const piece = command._pieces[alias][index];
    if (!pendingCommands.has(piece)) {
      pendingCommands.set(piece, []);
    }
    pendingCommands.get(piece)!.push([command, alias]);
  };

  // 1. Prepare global options
  addPendingOptions(breadc._options);
  if (breadc._init.builtin?.version !== false) {
    const option = buildVersionOption(context);
    pendingLongOptions.set(option.long, option);
    if (option.short) {
      pendingShortOptions.set(option.short, option);
    }
  }
  if (breadc._init.builtin?.help !== false) {
    const option = buildHelpOption(context);
    pendingLongOptions.set(option.long, option);
    if (option.short) {
      pendingShortOptions.set(option.short, option);
    }
  }

  // 2. Prepare root commands and options
  if (defaultCommand) {
    matchedCommand = defaultCommand;

    for (const command of breadc._commands) {
      if (command._default) {
        buildCommand(command);
        addPendingOptions(command._options);
      }
    }
  } else {
    for (const command of breadc._commands) {
      if (!command._default) {
        for (let alias = 0; alias < command._pieces.length; alias++) {
          addPendingCommand(command, alias);
        }
      }
    }
  }

  // 3. Main parser loop
  while (!tokens.isEnd) {
    const token = tokens.next()!;
    const rawToken = token.toRaw();

    if (token.isEscape) {
      // 1. `--` handle escape
      context.remaining.push(...tokens.remaining().map((t) => t.toRaw()));
    } else if (!matchedCommand && pendingCommands.has(rawToken)) {
      // 2. sub-command matched
      index += 1;
      context.pieces.push(rawToken);

      const nextCommands = pendingCommands.get(rawToken)!;
      pendingCommands.clear();
      for (const [command, alias] of nextCommands) {
        const pieces = command._pieces[alias];
        if (index === pieces.length) {
          if (isGroup(command)) {
            const group = command;

            if (!matchedGroup || matchedGroup === group) {
              matchedGroup = group;
            } else {
              throw new BreadcAppError(BreadcAppError.DUPLICATED_GROUP, {
                context,
                commands: [matchedGroup, group]
              });
            }

            buildGroup(group);
            addPendingOptions(group._options);
            for (const command of group._commands) {
              for (let alias = 0; alias < command._pieces.length; alias++) {
                addPendingCommand(command, alias);
              }
            }
          } else {
            if (!matchedCommand || matchedCommand === command) {
              matchedCommand = command;
            } else {
              throw new BreadcAppError(BreadcAppError.DUPLICATED_COMMAND, {
                context,
                commands: [matchedCommand, command]
              });
            }

            buildCommand(command);
            addPendingOptions(command._options);
          }
        } else {
          addPendingCommand(command, alias);
        }
      }
    } else if (token.isLong || (token.isShort && !token.isNegativeNumber)) {
      // 3. handle long options or short options (not negative number)
      const isLong = token.isLong;
      const [key, value] = isLong ? token.toLong() : token.toShort();
      const option = isLong
        ? pendingLongOptions.get(key) || pendingNegateOptions.get(key)
        : pendingShortOptions.get(key);

      if (option) {
        if (!matchedOptions.has(option.long) || matchedOptions.get(option.long)?.option !== option) {
          matchedOptions.set(option.long, new MatchedOption(option));
        }
        const matchedOption = matchedOptions.get(option.long)!;
        matchedOption.accept(context, key, value);
      } else {
        const unknownOptionMiddlewares = [
          ...breadc._unknownOptionMiddlewares,
          ...(matchedGroup?._unknownOptionMiddlewares ?? []),
          ...(matchedCommand?._unknownOptionMiddlewares ?? [])
        ];
        for (const middleware of unknownOptionMiddlewares) {
          const result = middleware(context, key, value);
          if (result) {
            // TODO: check following unknown option logic
            const matched = new MatchedOption(
              rawOption(isLong ? `--${key}` : `-${key}`, result.type ?? 'optional', key, undefined, {})
            ).accept(context, key, value);
            matchedOptions.set(key, matched);
            break;
          }
        }
      }
    } else {
      // 4. no matching
      if (matchedCommand) {
        args.push(rawToken);
      } else {
        unknown.push(rawToken);
      }
    }
  }

  context.group = matchedGroup;
  context.command = matchedCommand;

  // Fulfill the matched arguments
  if (matchedCommand) {
    let i = 0;
    for (; i < matchedCommand._arguments.length; i++) {
      const argument = matchedCommand._arguments[i];
      const matchedArgument = new MatchedArgument(argument);
      const value: string | undefined = args[i];

      if (argument.type === 'required') {
        if (value === undefined) {
          throw new RuntimeError(RuntimeError.REQUIRED_ARGUMENT_MISSING, {
            context,
            argument
          });
        }
        matchedArgument.accept(context, value);
        context.arguments.push(matchedArgument);
      } else if (argument.type === 'optional') {
        matchedArgument.accept(context, value);
        context.arguments.push(matchedArgument);
      } else {
        for (; i < args.length; i++) {
          matchedArgument.accept(context, args[i]);
        }
        context.arguments.push(matchedArgument);
      }
    }
    if (i < args.length) {
      context.remaining.unshift(...args.slice(i));
    }
  } else {
    // Fill missing unknown arguments
    context.arguments.push(
      ...unknown.map((arg, idx) => new MatchedArgument(rawArgument('required', `arg_${idx}`)).accept(context, arg))
    );
  }

  return matchedCommand;
}
