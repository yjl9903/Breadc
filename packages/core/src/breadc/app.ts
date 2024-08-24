import { parse, run } from '../parser/index.ts';
import { type Container, Context } from '../parser/context.ts';

import type { InferOption } from './infer.ts';

import { type OptionConfig, makeOption, Option } from './option.ts';
import { type CommandConfig, Command, makeCommand } from './command.ts';
import { makeVersionCommand } from './builtin/version.ts';
import { makeHelpCommand } from './builtin/help.ts';

export interface BreadcConfig {
  version?: string;

  description?: string;

  builtin?: {
    version?: {
      /**
       * @default true
       */
      enable?: boolean;

      /**
       * @default '-v, --version'
       */
      format?: string | string[];
    };

    help?: {
      /**
       * @default true
       */
      enable?: boolean;

      /**
       * @default '-h, --help'
       */
      format?: string | string[];
    };
  };
}

export class Breadc<GO extends Record<string, any> = {}> {
  name: string;

  config: BreadcConfig;

  #container: Container = {
    globalOptions: [],
    commands: []
  };

  public constructor(name: string, config: BreadcConfig = {}) {
    this.name = name;
    this.config = config;

    if (config.builtin?.version?.enable !== false) {
      this.#container.commands.push(makeVersionCommand(name, config));
    }
    if (config.builtin?.help?.enable !== false) {
      this.#container.commands.push(makeHelpCommand(name, config));
    }
  }

  // --- Builder ---

  public addOption<F extends string, O extends Option<F>>(
    option: O
  ): Breadc<GO & InferOption<O['format'], O['config']>> {
    this.#container.globalOptions.push(makeOption(option as any));
    return this;
  }

  public option<F extends string, C extends OptionConfig<F>>(
    format: F,
    description?: string | C,
    config?: Omit<C, 'description'>
  ): Breadc<GO & InferOption<F, C>> {
    const resolvedConfig =
      typeof description === 'string'
        ? { ...config, description }
        : { ...description, ...config };
    const option = new Option<F>(format, resolvedConfig);
    this.#container.globalOptions.push(makeOption(option));
    return this;
  }

  public addCommand<F extends string>(command: Command<F, GO>): Breadc<GO> {
    this.#container.commands.push(makeCommand(command));
    return this;
  }

  public command<F extends string>(
    format: F,
    description?: string | CommandConfig,
    config?: Omit<CommandConfig, 'description'>
  ): Command<F, GO> {
    const resolvedConfig =
      typeof description === 'string'
        ? { ...config, description }
        : { ...description, ...config };
    const command = new Command<F, GO>(format, resolvedConfig);
    this.#container.commands.push(makeCommand(command));
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
    const context = new Context(this.#container, args);
    return parse(context);
  }

  /**
   * Parse the arguments and run the the corresponding action function
   *
   * @param args input arguments
   * @returns the returned value from the corresponding action function
   */
  public run<T = unknown>(args: string[]): T {
    const context = this.parse(args);
    return run(context);
  }
}
