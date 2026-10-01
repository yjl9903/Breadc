import type { Breadc, InternalBreadc, InternalOption, InternalGroup, InternalCommand } from '../breadc/index.ts';

import { camelCase, splitOnce } from '../utils/string.ts';
import { rawOption } from '../breadc/option.ts';
import { rawArgument } from '../breadc/command.ts';
import { buildHelpOption } from '../breadc/builtin/help.ts';
import { buildVersionOption } from '../breadc/builtin/version.ts';
import { RuntimeError, BreadcAppError } from '../error.ts';

import { MatchedArgument, MatchedOption } from './matched.ts';
import { type Context, context as makeContext, reset } from './context.ts';
import { buildApp, buildCommand, buildGroup, isGroup } from './builder.ts';

type ParseFallback = { group: InternalGroup } | { command: InternalCommand };

type OptionBinding = { option: InternalOption; inverted: boolean };

interface ParseResult {
  args: string[];
  unmatchedArgs: string[];
  unknownOption?: { name: string; value: string | undefined };
}

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
  let result = doParse(context, onlyDefaultCommand ? { command: defaultCommand } : undefined);

  if (context.command || isVersion(context) || isHelp(context)) {
    // 4.1. No fallback needed
  } else if (context.group) {
    // 4.2. Parse with group default command
    const matchedGroup = context.group;
    reset(context);
    result = doParse(context, { group: matchedGroup });
  } else if (defaultCommand) {
    // 4.3. Parse with default command
    reset(context);
    result = doParse(context, { command: defaultCommand });
  }

  // 5. Validate the final pass and bind arguments
  const { args, unmatchedArgs, unknownOption } = result;
  const { command } = context;

  if (unknownOption) {
    throw new RuntimeError(`${RuntimeError.UNKNOWN_OPTION}: ${unknownOption.name}`, {
      context,
      ...unknownOption
    });
  }

  if (isHelp(context) || isVersion(context)) {
    return context;
  }

  if (command) {
    if (unmatchedArgs.length > 0) {
      throw new RuntimeError(RuntimeError.UNEXPECTED_ARGUMENTS, { context });
    }

    // Fulfill the matched arguments
    let i = 0;
    for (; i < command._arguments.length; i++) {
      const argument = command._arguments[i];
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
        if (value !== undefined) {
          matchedArgument.accept(context, value);
        }
        context.arguments.push(matchedArgument);
      } else {
        for (; i < args.length; i++) {
          matchedArgument.accept(context, args[i]);
        }
        context.arguments.push(matchedArgument);
      }
    }
    if (i < args.length) {
      throw new RuntimeError(RuntimeError.UNEXPECTED_ARGUMENTS, { context });
    }
  } else {
    // Fill missing unknown arguments
    context.arguments.push(
      ...unmatchedArgs.map((arg, idx) =>
        new MatchedArgument(rawArgument('required', `arg_${idx}`)).accept(context, arg)
      )
    );
  }

  for (const option of context.options.values()) {
    option.finalize();
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
  if (help) {
    const matched = context.options.get(help.long);
    return matched?.option === help && matched.value<boolean>();
  } else {
    return false;
  }
}

export function isVersion(context: Context<any>) {
  const version = context.breadc._version;
  if (version) {
    const matched = context.options.get(version.long);
    return matched?.option === version && matched.value<boolean>();
  } else {
    return false;
  }
}

// Short option boundaries depend on declarations, so resolve them here rather than in the lexer.
function* parseShortOptions(
  text: string,
  options: Map<string, OptionBinding>
): Generator<[key: string, value: string | undefined]> {
  for (let i = 1; i < text.length; i++) {
    const key = text[i];
    const option = options.get(key)?.option;
    if (!option) {
      // Keep an unknown suffix intact for the existing unknown-option middleware.
      yield splitOnce(text.slice(i), '=');
      return;
    }

    const rest = text.slice(i + 1);
    if (rest.startsWith('=')) {
      yield [key, rest.slice(1)];
      return;
    }
    if (option.type !== 'boolean') {
      yield [key, rest || undefined];
      return;
    }
    yield [key, undefined];
  }
}

// Match one pass into context. Defer unknown-option validation and argument binding
// until the caller has selected the final pass, including any default-command fallback.
function doParse(context: Context, fallback?: ParseFallback): ParseResult {
  const { breadc, tokens, options: matchedOptions } = context;
  const defaultGroup = fallback && 'group' in fallback ? fallback.group : undefined;
  const defaultCommand = fallback && 'command' in fallback ? fallback.command : undefined;

  let index = 0;
  let matchedGroup: InternalGroup | undefined = undefined;
  let matchedCommand: InternalCommand | undefined = defaultCommand;
  let candidateCommand: InternalCommand | undefined = undefined;
  let candidateCommandIndex = -1;
  let candidateTailTokens: string[] = [];

  const pendingCommands: Map<string, Array<[InternalGroup | InternalCommand, number]>> = new Map();
  const pendingLongOptions: Map<string, OptionBinding> = new Map();
  const pendingShortOptions: Map<string, OptionBinding> = new Map();
  const registeredOptions: Map<string, InternalOption> = new Map();
  const args: string[] = [];
  const unmatchedArgs: string[] = [];
  let unknownOption: ParseResult['unknownOption'];

  const registerOption = (option: InternalOption) => {
    const previous = registeredOptions.get(option.long);
    if (previous) {
      // A more specific declaration replaces every spelling of the previous option.
      for (const name of [previous.long, 'no-' + previous.long]) {
        if (pendingLongOptions.get(name)?.option === previous) {
          pendingLongOptions.delete(name);
        }
      }
      if (previous.short && pendingShortOptions.get(previous.short)?.option === previous) {
        pendingShortOptions.delete(previous.short);
      }
    }
    registeredOptions.set(option.long, option);

    if (option.form !== 'negative') {
      pendingLongOptions.set(option.long, { option, inverted: false });
    }
    if (option.form === 'negative' || option.form === 'both') {
      pendingLongOptions.set('no-' + option.long, { option, inverted: true });
    }
    if (option.short) {
      pendingShortOptions.set(option.short, { option, inverted: option.form === 'negative' });
    }
  };

  const addPendingOptions = (options: InternalOption[]) => {
    for (const option of options) {
      registerOption(option);

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
  const setCandidateCommand = (command: InternalCommand) => {
    if (candidateCommandIndex >= index) {
      if (candidateCommand && candidateCommand !== command) {
        throw new BreadcAppError(BreadcAppError.DUPLICATED_COMMAND, {
          context,
          commands: [candidateCommand, command]
        });
      }
      return;
    }

    candidateCommand = command;
    candidateCommandIndex = index;
    candidateTailTokens = [];
  };
  const commitCandidateCommand = () => {
    if (!candidateCommand) {
      return;
    }

    matchedCommand = candidateCommand;
    context.pieces.length = candidateCommandIndex;
    buildCommand(candidateCommand);
    addPendingOptions(candidateCommand._options);
    args.push(...candidateTailTokens);

    candidateCommand = undefined;
    candidateCommandIndex = -1;
    candidateTailTokens = [];
  };

  // 1. Prepare global options
  addPendingOptions(breadc._options);
  if (breadc._init.builtin?.version !== false) {
    registerOption(buildVersionOption(context));
  }
  if (breadc._init.builtin?.help !== false) {
    registerOption(buildHelpOption(context));
  }

  // 2. Prepare root commands and options
  if (defaultCommand) {
    matchedCommand = defaultCommand;

    buildCommand(defaultCommand);
    addPendingOptions(defaultCommand._options);
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

    // Commit candiate command
    if (!matchedCommand && candidateCommand && !pendingCommands.has(rawToken)) {
      commitCandidateCommand();
    }

    if (token.isEscape) {
      // 1. `--` handle escape
      context.remaining.push(...tokens.remaining().map((t) => t.toRaw()));
    } else if (!matchedCommand && pendingCommands.has(rawToken)) {
      // 2. sub-command matched
      if (candidateCommand) {
        candidateTailTokens.push(rawToken);
      }
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

            if (matchedGroup && matchedGroup === defaultGroup) {
              // Match group default command
              const defaultCommands = matchedGroup._commands.filter((command) =>
                command._pieces.some((p) => p.length === index)
              );
              if (defaultCommands.length === 1) {
                const defaultCommand = defaultCommands[0];
                setCandidateCommand(defaultCommand);
              } else if (defaultCommands.length > 1) {
                throw new BreadcAppError(BreadcAppError.DUPLICATED_DEFAULT_GROUP_COMMAND, {
                  context,
                  group: matchedGroup,
                  commands: defaultCommands
                });
              }
            } else {
              for (const command of group._commands) {
                for (let alias = 0; alias < command._pieces.length; alias++) {
                  // Skip group default command
                  if (command._pieces[alias].length === index) {
                    continue;
                  }
                  addPendingCommand(command, alias);
                }
              }
            }
          } else {
            setCandidateCommand(command);
          }
        } else {
          addPendingCommand(command, alias);
        }
      }
    } else if (token.isOption) {
      // 3. handle long options or short options (not negative number)
      const isLong = token.isLong;
      const entries = isLong ? [token.toLong()] : parseShortOptions(rawToken, pendingShortOptions);
      for (const [key, value] of entries) {
        const binding = isLong ? pendingLongOptions.get(key) : pendingShortOptions.get(key);

        if (binding) {
          const { option, inverted } = binding;
          if (!matchedOptions.has(option.long) || matchedOptions.get(option.long)?.option !== option) {
            matchedOptions.set(option.long, new MatchedOption(option));
          }
          const matchedOption = matchedOptions.get(option.long)!;
          matchedOption.accept(context, key, value, inverted);
        } else {
          const unknownOptionMiddlewares = [
            ...breadc._unknownOptionMiddlewares,
            ...(matchedGroup?._unknownOptionMiddlewares ?? []),
            ...(matchedCommand?._unknownOptionMiddlewares ?? [])
          ];
          let accepted = false;
          for (const middleware of unknownOptionMiddlewares) {
            const result = middleware(context, key, value);
            if (result) {
              // TODO: check following unknown option logic
              const matched = new MatchedOption(
                rawOption(isLong ? `--${key}` : `-${key}`, undefined, result.type ?? 'optional', key, undefined, {})
              ).accept(context, key, value);
              matchedOptions.set(key, matched);
              accepted = true;
              break;
            }
          }
          if (!accepted && !unknownOption) {
            unknownOption = { name: isLong ? `--${key}` : `-${key}`, value };
          }
        }
      }
    } else {
      // 4. no matching
      if (matchedCommand) {
        args.push(rawToken);
      } else {
        unmatchedArgs.push(rawToken);
      }
    }
  }

  if (!matchedCommand) {
    commitCandidateCommand();
  }

  context.group = matchedGroup;
  context.command = matchedCommand;

  return { args, unmatchedArgs, unknownOption };
}
