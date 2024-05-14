import { Context } from '../parser/context.ts';

import type { BreadcOptions } from './types.ts';

import { Option } from './option.ts';
import { Command } from './command.ts';

export class Breadc<GO extends object = {}> {
  public name: string;

  public version: string | undefined = undefined;

  public description: string | undefined = undefined;

  public constructor(name: string, options: BreadcOptions = {}) {
    this.name = name;
  }

  // --- Builder ---

  public addOption<F extends string>(option: Option<F>): Breadc<GO> {
    // TODO
    return this;
  }

  public option<F extends string>(format: F): Breadc<GO> {
    const option = new Option<F>(format);
    // TODO
    return this;
  }

  public addCommand<F extends string>(command: Command<F>): Breadc<GO> {
    // TODO
    return this;
  }

  public command<F extends string>(format: F): Command<F> {
    // '' / '[...]' / '<...>' should be treated as the default command
    if (format.length === 0 || format[0] === '[' || format[0] === '<') {
      return this.default(format);
    }
    const command = new Command<F>(format);
    // TODO
    return command;
  }

  // TODO
  private default<F extends string>(format: F): Command<F> {
    const command = new Command<F>(format);
    // TODO
    return command;
  }

  // --- Parse ---

  // TODO
  public parse(args: string[]) {
    const context = new Context(args);
  }

  // TODO
  public async run(args: string[]) {
    const context = new Context(args);
  }
}
