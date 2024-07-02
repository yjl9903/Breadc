import type { BreadcOptions } from './types.ts';

import { parse, run } from '../parser/index.ts';
import { type Container, Context } from '../parser/context.ts';

import { Option } from './option.ts';
import { Command } from './command.ts';

export class Breadc<GO extends object = {}> {
  public name: string;

  public version: string | undefined = undefined;

  public description: string | undefined = undefined;

  private container: Container = {
    options: [],
    commands: []
  };

  public constructor(name: string, options: BreadcOptions = {}) {
    this.name = name;
  }

  // --- Builder ---

  public addOption<F extends string>(option: Option<F>): Breadc<GO> {
    this.container.options.push(option);
    return this;
  }

  public option<F extends string>(format: F): Breadc<GO> {
    const option = new Option<F>(format);
    this.container.options.push(option);
    return this;
  }

  public addCommand<F extends string>(command: Command<F>): Breadc<GO> {
    this.container.commands.push(command);
    return this;
  }

  public command<F extends string>(format: F): Command<F> {
    // '' / '[...]' / '<...>' should be treated as the default command
    // if (format.length === 0 || format[0] === '[' || format[0] === '<') {
    //   return this.default(format);
    // }
    const command = new Command<F>(format);
    this.container.commands.push(command);
    return command;
  }

  // --- Parse / Run ---

  /**
   * Parse the arguments only
   *
   * @param args input arguments
   * @returns the parsed context
   */
  public parse(args: string[]) {
    const context = new Context(this.container, args);
    return parse(context);
  }

  /**
   * Parse the arguments and run the the corresponding action function
   *
   * @param args input arguments
   * @returns the returned value from the corresponding action function
   */
  public async run<T = unknown>(args: string[]): Promise<T> {
    const context = this.parse(args);
    return run(context);
  }
}
