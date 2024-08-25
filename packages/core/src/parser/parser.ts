import type { IOption, ICommand } from '../breadc/types.ts';

import { BreadcError, RuntimeError } from '../error.ts';

import type { Context } from './context.ts';

import { MatchedArgument, MatchedOption } from './matched.ts';

export function parse(context: Context): Context {
  // 1. Resolve the first constant pieces of all the command
  const { commands } = context.matching;
  let defaultCommand: ICommand | undefined; // Find default command
  for (const command of context.container.commands) {
    command.resolveSubCommand();
    if (command.isDefault) {
      if (defaultCommand !== undefined) {
        throw new BreadcError(`Find duplicated default command`);
      }
      defaultCommand = command;
    } else {
      const piece = command.pieces[0];
      if (piece) {
        if (commands.has(piece)) {
          commands.get(piece)!.push([command, undefined]);
        } else {
          commands.set(piece, [[command, undefined]]);
        }
      }

      // Commit sub-command with alias
      for (
        let aliasIndex = 0;
        aliasIndex < command.aliases.length;
        aliasIndex++
      ) {
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

  const onlyDefaultCommand =
    defaultCommand !== undefined && context.container.commands.length === 1;
  if (onlyDefaultCommand) {
    defaultCommand!.resolve();
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
        argument.accept(context, token ? token.toRaw() : undefined);
        context.arguments.push(argument);

        if (token !== undefined) {
          it++;
        }
      }
    }
    if (context.command.spread) {
      const spread = new MatchedArgument(context.command.spread);
      const spreadArgs = args.slice(it);
      spread.accept(
        context,
        spreadArgs.map((t) => t.toRaw())
      );
      context.arguments.push(spread);
    } else {
      context.remaining.unshift(...args.slice(it));
    }
  }

  return context;
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
  // 1. Commit pending global options
  addPendingOptions(context, context.container.globalOptions);
  if (context.command) {
    addPendingOptions(context, context.command.options);
  }

  // 2. Parse arguments
  let matched = withDefaultCommand; // Command has been matched and will not be changed
  let subCommandIndex = 0; // Maintain sub-command length
  const {
    commands,
    arguments: args,
    options,
    unknownOptions
  } = context.matching;

  while (!context.tokens.isEnd) {
    const token = context.tokens.next()!;
    const rawToken = token.toRaw();

    if (token.isEscape) {
      // 2.1. `--` handle escape
      context.remaining.push(...context.tokens.remaining());
    } else if (!matched && commands.has(rawToken)) {
      // 2.2. sub-command matched
      const nextCommands = commands.get(rawToken)!;

      // 2.2.1. Commit pending sub-commands
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
              // TODO: throw breadc error
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
              // TODO: throw breadc error
            }
            matchedCommand = command;
          }
        }
      }

      // 2.2.2. Find matched command and add pending options
      if (matchedCommand) {
        context.command = matchedCommand;
        addPendingOptions(context, matchedCommand.options);

        if (commands.size === 0) {
          matched = true;
        }
      }
    } else if (token.isLong || (token.isShort && !token.isNegativeNumber)) {
      // 2.3. handle long options or short options (not negative number)
      const [key, value] = token.isLong ? token.toLong()! : token.toShort()!;
      const option = options.get(key);

      if (option) {
        // Match option and set value
        const matched = context.options.get(option.name)!;
        matched.accept(context, key, value);
      } else {
        // Handle unknown long options or short options
        unknownOptions.push([key, value]);
      }
    } else {
      // 2.4. no matching
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
