import type { IOption } from '../breadc/types.ts';

import { BreadcAppError, RuntimeError } from '../error.ts';
import { Option, makeOption } from '../breadc/option.ts';

import type { Token } from './lexer.ts';
import type { Context, OnUnknownOptions } from './context.ts';

import { MatchedArgument, MatchedOption } from './matched.ts';

export function parse(context: Context): Context {
  // 1. Check whether it only has default command
  const defaultCommands = context.container.commands.filter((c) => c.isDefault);
  if (defaultCommands.length >= 2) {
    throw new BreadcAppError(BreadcAppError.DUPLICATED_DEFAULT_COMMAND, {
      commands: defaultCommands
    });
  }

  const defaultCommand = defaultCommands[0];
  const onlyDefaultCommand =
    defaultCommand !== undefined && context.container.commands.length === 0;
  if (onlyDefaultCommand) {
    context.command = defaultCommand;
  }

  // 2. Try parsing without command
  doParse(context, onlyDefaultCommand);

  // 3. Match command or fallback to default command
  if (context.command) {
    // Resolve matched command
    context.command.resolve();
  } else if (defaultCommand) {
    // Fall back to the default command, reset context state
    context.reset();
    // Resolve default command
    defaultCommand.resolve();
    context.command = defaultCommand;
    doParse(context, true);
  }

  // 4. Fulfill the matched arguments
  if (context.command) {
    const { arguments: args } = context.matching;

    let it = 0;
    if (context.command.requireds) {
      for (const required of context.command.requireds) {
        const token = args[it];
        if (token !== undefined) {
          const argument = new MatchedArgument(required);
          argument.accept(context, token.toRaw());
          context.arguments.push(argument);
        } else {
          // TODO: record error
          throw new RuntimeError();
        }
        it++;
      }
    }
    if (context.command.optionals) {
      for (const optional of context.command.optionals) {
        const token = args[it];
        const argument = new MatchedArgument(optional);
        if (token !== undefined) {
          argument.accept(context, token ? token.toRaw() : undefined);
        }
        context.arguments.push(argument);

        if (token !== undefined) {
          it++;
        }
      }
    }
    if (context.command.spread) {
      const spread = new MatchedArgument(context.command.spread);
      const spreadArgs = args.slice(it);
      if (spreadArgs.length > 0) {
        spread.accept(
          context,
          spreadArgs.map((t) => t.toRaw())
        );
      }
      context.arguments.push(spread);
    } else {
      context.remaining.unshift(...args.slice(it));
    }
  }

  return context;
}

/**
 * Add builtin version and help commands to pending commands
 *
 * @param context
 * @param initialize
 */
function addPendingBuiltinCommands(context: Context, initialize: boolean) {
  const { commands } = context.matching;

  if (context.container.version) {
    const command = context.container.version;
    for (
      let aliasIndex = 0;
      aliasIndex < command.aliases.length;
      aliasIndex++
    ) {
      const piece = command.aliases[aliasIndex];
      if (piece && !commands.has(piece)) {
        commands.set(piece, [[command, aliasIndex]]);
        if (initialize) {
          command.aliasPos[aliasIndex] = piece.length;
          command.aliasPieces[aliasIndex] = [piece];
        }
      }
    }
  }
  if (context.container.help) {
    const command = context.container.help;
    for (
      let aliasIndex = 0;
      aliasIndex < command.aliases.length;
      aliasIndex++
    ) {
      const piece = command.aliases[aliasIndex];
      if (piece && !commands.has(piece)) {
        commands.set(piece, [[command, aliasIndex]]);
        if (initialize) {
          command.aliasPos[aliasIndex] = piece.length;
          command.aliasPieces[aliasIndex] = [piece];
        }
      }
    }
  }
}

/**
 * Add pending options
 *
 * @param options the pending options
 */
function addPendingOptions(context: Context, pendingOptions: IOption[]) {
  const { options } = context.matching;

  for (const option of pendingOptions) {
    option.resolve();

    // Initialize the matched option
    const matched = new MatchedOption(option);
    context.options.set(option.name, matched);

    // Find the options by its long, short, or negated format
    options.set(option.long, option);

    if (option.short !== undefined) {
      options.set(option.short, option);
    }

    if (option.config.negated) {
      options.set(`--no-${option.name}`, option);
    }
  }
}

function doParse(context: Context, withDefaultCommand: boolean = false) {
  const { tokens } = context;
  const { commands, arguments: args, options } = context.matching;

  // 1. Commit pending global options
  addPendingOptions(context, context.container.globalOptions);
  if (withDefaultCommand) {
    addPendingOptions(context, context.command!.options);
  }

  let matched = withDefaultCommand; // Command has been matched and will not be changed
  let subCommandIndex = 0; // Maintain sub-command length

  if (!withDefaultCommand) {
    // 2. Pre-parsing until the first unknown argument
    while (!tokens.isEnd) {
      const token = tokens.next()!;
      const rawToken = token.toRaw();

      if (token.isEscape) {
        // 2.1. handle `--` escape
        context.remaining.push(...tokens.remaining());
        break;
      }
      if (token.isLong || (token.isShort && !token.isNegativeNumber)) {
        // 2.2. handle long options or short options (not negative number)
        const [key, value] = token.isLong ? token.toLong()! : token.toShort()!;
        const option = options.get(key);

        if (option) {
          // Match option and set value
          const matched = context.options.get(option.name)!;
          matched.accept(context, key, value);
          continue;
        }
      }
      {
        // 2.3. try matching each prefix of sub-commands
        const { commands } = context.matching;
        for (const command of context.container.commands) {
          // Match the sub-command prefix
          if (command.format.startsWith(rawToken)) {
            command.resolveSubCommand();
            const piece = command.pieces[0];
            if (piece) {
              if (commands.has(piece)) {
                commands.get(piece)!.push([command, undefined]);
              } else {
                commands.set(piece, [[command, undefined]]);
              }
            }
          }
          // Commit sub-command with alias
          for (
            let aliasIndex = 0;
            aliasIndex < command.aliases.length;
            aliasIndex++
          ) {
            if (command.aliases[aliasIndex].startsWith(rawToken)) {
              command.resolveAliasSubCommand(aliasIndex);
              const alias = command.aliasPieces[aliasIndex];
              const piece = alias[0];
              if (piece) {
                if (commands.has(piece)) {
                  commands.get(piece)!.push([command, aliasIndex]);
                } else {
                  commands.set(piece, [[command, aliasIndex]]);
                }
              }
            }
          }
        }

        // Initialize builtin version and help commands
        addPendingBuiltinCommands(context, true);

        // Recover lexer state
        tokens.prev();
        break;
      }
    }
  }

  // 3. Main parsing logic
  while (!tokens.isEnd) {
    const token = tokens.next()!;
    const rawToken = token.toRaw();

    if (token.isEscape) {
      // 3.1. `--` handle escape
      context.remaining.push(...tokens.remaining());
    } else if (!matched && commands.has(rawToken)) {
      // 3.2. sub-command matched
      context.matching.pieces.push(rawToken);
      const nextCommands = commands.get(rawToken)!;
      // console.log('next commands', nextCommands)

      // 3.2.1. Commit pending sub-commands
      let matchedCommand;
      const currentIndex = ++subCommandIndex;
      commands.clear();
      for (const [command, aliasIndex] of nextCommands) {
        if (aliasIndex === undefined) {
          // Original command
          command.resolveSubCommand();
          const piece = command.pieces[currentIndex];
          if (piece) {
            // Still need matching
            if (commands.has(piece)) {
              commands.get(piece)!.push([command, undefined]);
            } else {
              commands.set(piece, [[command, undefined]]);
            }
          } else {
            // Fully matched
            if (matchedCommand) {
              throw new BreadcAppError(BreadcAppError.DUPLICATED_COMMAND, {
                commands: [matchedCommand, command]
              });
            }
            matchedCommand = command;
          }
        } else {
          // Alias command
          command.resolveAliasSubCommand(aliasIndex);
          const piece = command.aliasPieces[aliasIndex][currentIndex];
          if (piece) {
            // Still need matching
            if (commands.has(piece)) {
              commands.get(piece)!.push([command, aliasIndex]);
            } else {
              commands.set(piece, [[command, aliasIndex]]);
            }
          } else {
            // Fully matched
            if (matchedCommand) {
              throw new BreadcAppError(BreadcAppError.DUPLICATED_COMMAND, {
                commands: [matchedCommand, command]
              });
            }
            matchedCommand = command;
          }
        }
      }

      if (matchedCommand) {
        // 3.2.2. Find matched command and add pending options
        context.command = matchedCommand;
        addPendingOptions(context, matchedCommand.options);

        if (commands.size === 0) {
          matched = true;
        }
      } else {
        // 3.2.3. Add pending builtin version and help command
        addPendingBuiltinCommands(context, false);
      }
    } else if (token.isLong || (token.isShort && !token.isNegativeNumber)) {
      // 3.3. handle long options or short options (not negative number)
      const [key, value] = token.isLong ? token.toLong()! : token.toShort()!;
      const option = options.get(key);

      if (option) {
        // 3.3.1. Match option and set value
        const matchedOption = context.options.get(option.name)!;
        matchedOption.accept(context, key, value);
      } else {
        // 3.3.2. Fallback to help / version options
        if (matched) {
          if (context.container.help) {
            const isHelp = context.container.help.aliases.includes(rawToken);
            if (isHelp) {
              context.matching.pieces.push(rawToken);
              context.command = context.container.help;
              continue;
            }
          }
          if (context.container.version) {
            const isVersion =
              context.container.version.aliases.includes(rawToken);
            if (isVersion) {
              context.matching.pieces.push(rawToken);
              context.command = context.container.version;
              continue;
            }
          }
        }

        // 3.3.3. Handle unknown long options or short options
        const onUnknownOptions =
          context.command?.onUnknownOptions ??
          context.container.onUnknownOptions;
        if (onUnknownOptions) {
          const option = onUnknownOptions(context, token);
          if (option) {
            context.options.set(option.option.name, option);
          }
        } else {
          // TODO: record error
          return false;
        }
      }
    } else {
      // 3.4. no matching
      if (context.command) {
        matched = true;
        args.push(token);
      } else {
        // TODO: record error
        return false;
      }
    }
  }

  return true;
}

export const defaultOnUnknownOptions: OnUnknownOptions = (
  context: Context,
  token: Token
) => {
  const [key, value] = token.isLong ? token.toLong()! : token.toShort()!;
  const option = makeOption(new Option(key));
  const matched = new MatchedOption(option);

  option.long = key;
  if (key.startsWith('--no-')) {
    option.name = key.slice('--no-'.length);
    option.name = 'boolean';
  } else {
    option.name = key.replace(/^--?/, '');
    if (value === undefined) {
      option.type = 'boolean';
    } else {
      option.type = 'optional';
    }
  }

  matched.accept(context, option.long, value);
  return matched;
};
