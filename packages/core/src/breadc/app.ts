import { parse, run } from '../parser/index.ts';
import { type Container, Context } from '../parser/context.ts';

import { type OptionConfig, makeOption, Option } from './option.ts';
import { type CommandConfig, Command, makeCommand } from './command.ts';

export interface BreadcConfig {
  version?: string;

  descriptions?: string;
}

export class Breadc<GO extends object = {}> {
  public name: string;

  public version: string | undefined = undefined;

  public description: string | undefined = undefined;

  private container: Container = {
    globalOptions: [],
    commands: []
  };

  public constructor(name: string, config: BreadcConfig = {}) {
    this.name = name;
  }

  // --- Builder ---

  public addOption<F extends string>(option: Option<F>): Breadc<GO> {
    this.container.globalOptions.push(makeOption(option));
    return this;
  }

  public option<F extends string>(
    format: F,
    descriptionOrConfig?: string | OptionConfig,
    config?: Omit<OptionConfig, 'description'>
  ): Breadc<GO> {
    const resolvedConfig =
      typeof descriptionOrConfig === 'string'
        ? { ...config, description: descriptionOrConfig }
        : { ...descriptionOrConfig, ...config };
    const option = new Option<F>(format, resolvedConfig);
    this.container.globalOptions.push(makeOption(option));
    return this;
  }

  public addCommand<F extends string>(command: Command<F>): Breadc<GO> {
    this.container.commands.push(makeCommand(command));
    return this;
  }

  public command<F extends string>(
    format: F,
    descriptionOrConfig?: string | CommandConfig,
    config?: Omit<CommandConfig, 'description'>
  ): Command<F> {
    const resolvedConfig =
      typeof descriptionOrConfig === 'string'
        ? { ...config, description: descriptionOrConfig }
        : { ...descriptionOrConfig, ...config };
    const command = new Command<F>(format, resolvedConfig);
    this.container.commands.push(makeCommand(command));
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
