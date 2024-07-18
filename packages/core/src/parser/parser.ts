import type { Option } from '../breadc/option.ts';
import type { Command } from '../breadc/command.ts';

import { BreadcError, RuntimeError } from '../error.ts';

import { Context, MatchedOption } from './context.ts';

export function parse(context: Context): Context {
  // 1. Resolve the first constant pieces of all the command
  let defaultCommand: Command | undefined; // Find default command
  const commands = [];
  for (const command of context.container.commands) {
    command.resolveSubCommand();
    if (command.isDefault) {
      if (defaultCommand !== undefined) {
        throw new BreadcError(`Find duplicated default command`);
      }
      defaultCommand = command;
    } else {
      commands.push(command);
    }
  }

  /**
   * Commit the next pending commands.
   * Ensure commands should have been resolved constant.
   *
   * @param index the current sub-command matching index
   * @param commands the pending commands
   */
  function commitPendingCommands(index: number, commands: Command[]) {
    context.matching.commands.clear();
    for (const command of commands) {
      const piece = command.pieces[index];
      if (piece) {
        if (context.matching.commands.has(piece)) {
          context.matching.commands.get(piece)!.push(command);
        } else {
          context.matching.commands.set(piece, [command]);
        }
      }
    }
  }

  /**
   * Add pending options
   *
   * @param options the pending options
   */
  function addPendingOptions(options: Option[]) {
    for (const option of options) {
      const long = `--${option.long}`;
      context.matching.options.set(long, option);
      // TODO: support more options
    }
  }

  // 2. Commit pending sub-commands and global options
  let subCommandIndex = 0;
  commitPendingCommands(subCommandIndex++, commands);
  addPendingOptions(context.container.globalOptions);

  // 3. Parse arguments
  while (!context.lexer.isEnd) {
    const token = context.lexer.next()!;
    const rawToken = token.toRaw();

    if (token.isEscape) {
      // 3.1. `--` handle escape
      context.remaining.push(...context.lexer.remaining());
    } else if (context.matching.commands.has(rawToken)) {
      // 3.2. sub-command matched
      const nextCommands = context.matching.commands.get(rawToken)!;
      commitPendingCommands(subCommandIndex++, nextCommands);
      for (const command of nextCommands) {
        addPendingOptions(command.options);
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
