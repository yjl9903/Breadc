import type { AppOption, Logger } from './types';

import minimist from 'minimist';

import { createDefaultLogger } from './logger';
import { Option, OptionConfig } from './option';
import { Command, CommandConfig, createHelpCommand, createVersionCommand } from './command';

export class Breadc {
  private readonly name: string;
  private readonly version: string;

  private readonly logger: Logger;

  private readonly options: Option[] = [];
  private readonly commands: Command[] = [];

  constructor(name: string, option: AppOption) {
    this.name = name;
    this.version = option.version ?? 'unknown';
    this.logger = option.logger ?? createDefaultLogger(name);

    const breadc = {
      name: this.name,
      version: this.version,
      logger: this.logger,
      options: this.options,
      commands: this.commands
    };
    this.commands = [createVersionCommand(breadc), createHelpCommand(breadc)];
  }

  option(format: string, config: OptionConfig = {}) {
    try {
      const option = new Option(format, config);
      this.options.push(option);
    } catch (error: any) {
      this.logger.warn(error.message);
    }
    return this;
  }

  command(format: string, config: CommandConfig = {}) {
    const command = new Command(format, config);
    this.commands.push(command);
    return command;
  }

  parse(args: string[]) {
    const argv = minimist(args, {
      string: this.options.filter((o) => o.type === 'string').map((o) => o.name),
      boolean: this.options.filter((o) => o.type === 'boolean').map((o) => o.name),
      alias: this.options.reduce((map: Record<string, string>, o) => {
        if (o.shortcut) {
          map[o.shortcut] = o.name;
        }
        return map;
      }, {})
    });
    return argv;
  }

  async run(args: string[]) {
    const argv = this.parse(args);
    for (const command of this.commands) {
      if (command.checkCommand(argv)) {
        await command.run();
        return;
      }
    }
  }
}
