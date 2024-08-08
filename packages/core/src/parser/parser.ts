import type { IOption, ICommand } from '../breadc/types.ts';

import { BreadcError, RuntimeError } from '../error.ts';

import { Context, MatchedOption } from './context.ts';

export function parse(context: Context): Context {
  // 1. Resolve the first constant pieces of all the command
  let subCommandIndex = 0; // Maintain sub-command length
  let defaultCommand: ICommand | undefined; // Find default command
  for (const command of context.container.commands) {
    command.resolveSubCommand();
    if (command.isDefault()) {
      if (defaultCommand !== undefined) {
        throw new BreadcError(`Find duplicated default command`);
      }
      defaultCommand = command;
    } else {
      const piece = command.pieces[subCommandIndex];
      if (piece) {
        if (context.matching.commands.has(piece)) {
          context.matching.commands.get(piece)!.push([command, undefined]);
        } else {
          context.matching.commands.set(piece, [[command, undefined]]);
        }
      }

      // Commit sub-command with alias
      for (let aliasIndex = 0; aliasIndex < command.aliases.length; aliasIndex++) {
        command.resolveAliasSubCommand(aliasIndex);
        const alias = command.aliases[aliasIndex];
        const piece = alias[subCommandIndex];
        if (piece) {
          if (context.matching.commands.has(piece)) {
            context.matching.commands.get(piece)!.push([command, aliasIndex]);
          } else {
            context.matching.commands.set(piece, [[command, aliasIndex]]);
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
  function addPendingOptions(options: IOption[]) {
    for (const option of options) {
      const long = `--${option.long}`;
      context.matching.options.set(long, option);
      // TODO: support more options
    }
  }

  // 2. Commit pending global options
  addPendingOptions(context.container.globalOptions);

  // 3. Parse arguments
  while (!context.tokens.isEnd) {
    const token = context.tokens.next()!;
    const rawToken = token.toRaw();

    if (token.isEscape) {
      // 3.1. `--` handle escape
      context.remaining.push(...context.tokens.remaining());
    } else if (context.matching.commands.has(rawToken)) {
      // 3.2. sub-command matched
      const nextCommands = context.matching.commands.get(rawToken)!;

      // Commit pending sub-commands
      const currentIndex = subCommandIndex++;
      context.matching.commands.clear();
      for (const [command, aliasIndex] of nextCommands) {
        if (aliasIndex === undefined) {
          // Original command
          command.resolveSubCommand();
          const piece = command.pieces[currentIndex];
          if (piece) {
            if (context.matching.commands.has(piece)) {
              context.matching.commands.get(piece)!.push([command, undefined]);
            } else {
              context.matching.commands.set(piece, [[command, undefined]]);
            }
          }
        } else {
          // Alias command
          command.resolveAliasSubCommand(aliasIndex);
          const piece = command.aliases[aliasIndex][currentIndex];
          if (piece) {
            if (context.matching.commands.has(piece)) {
              context.matching.commands.get(piece)!.push([command, aliasIndex]);
            } else {
              context.matching.commands.set(piece, [[command, aliasIndex]]);
            }
          }
        }
      }

      // Commit pending options
      for (const [command] of nextCommands) {
        addPendingOptions(command.command.options);
      }
    } else if (token.isLong) {
      // 3.3. long options
      const [key, value] = token.toLong()!;
      const option = context.matching.options.get(key);
      if (option) {
        // Match option
        const matched =
          context.options.get(option) ?? new MatchedOption(option);
        matched.accept(context, value);
      } else {
        // TODO: unknown long options
      }
    } else if (token.isShort) {
      // 3.4. TODO: handle short options
      const [key, value] = token.toShort()!;
      const option = context.matching.options.get(key);
      if (option) {
        // Match option
        const matched =
          context.options.get(option) ?? new MatchedOption(option);
        matched.accept(context, value);
      } else {
        // TODO: unknown long options
      }
    } else {
      // 3.5. no matching
      context.matching.unknown.push(token);
    }
  }

  // 4. Fall back to the default command
  if (context.command) {
    // Resolve matched command
    context.command.resolve();
  } else {
    if (defaultCommand) {
      // Resolve default command
      defaultCommand.resolve();
      context.command = defaultCommand;
    } else {
      throw new RuntimeError(`Invalid arguments`);
    }
  }

  // 5. Fulfill the matched arguments

  return context;
}
