import type { Command } from '../breadc/command.ts';

import { BreadcError, RuntimeError } from '../error.ts';

import type { Lexer } from './lexer.ts';

import { Context } from './context.ts';

class Parser {
  private readonly lexer: Lexer;

  public constructor(lexer: Lexer) {
    this.lexer = lexer;
  }

  public next() {
    const token = this.lexer.next();
  }
}

export function parse(context: Context): Context {
  // 1. Resolve all the constant pieces of all the command
  let defaultCommand: Command | undefined; // Find default command
  const commands = [];
  for (const command of context.container.commands) {
    command.resolve();
    if (command.isDefault) {
      if (defaultCommand !== undefined) {
        throw new BreadcError(`Find duplicated default command`);
      }
      defaultCommand = command;
    } else {
      commands.push(command);
    }
  }

  // 2. Parse arguments
  while (!context.lexer.isEnd) {
    // TODO: parse logic
    context.lexer.next();
  }

  // 3. Fall back to the default command
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

  // TODO: parse args
  return context;
}
