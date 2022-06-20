import type { AppOption, ExtractOption, Logger, ParseResult } from './types';

import minimist from 'minimist';

import { createDefaultLogger } from './logger';
import { Option, OptionConfig } from './option';
import { Command, CommandConfig, createHelpCommand, createVersionCommand } from './command';

export class Breadc<GlobalOption extends string | never = never> {
  private readonly name: string;
  private readonly version: string;

  private readonly options: Option[] = [];
  private readonly commands: Command[] = [];

  readonly logger: Logger;

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

  option<F extends string>(
    format: F,
    config: OptionConfig = {}
  ): Breadc<GlobalOption | ExtractOption<F>> {
    try {
      const option = new Option(format, config);
      this.options.push(option);
    } catch (error: any) {
      this.logger.warn(error.message);
    }
    return this as Breadc<GlobalOption | ExtractOption<F>>;
  }

  command<F extends string>(format: F, config: CommandConfig = {}): Command<F, GlobalOption> {
    const command = new Command(format, config);
    this.commands.push(command);
    return command as Command<F, GlobalOption>;
  }

  parse(args: string[]): ParseResult {
    const alias = this.options.reduce((map: Record<string, string>, o) => {
      if (o.shortcut) {
        map[o.shortcut] = o.name;
      }
      return map;
    }, {});

    const argv = minimist(args, {
      string: this.options.filter((o) => o.type === 'string').map((o) => o.name),
      boolean: this.options.filter((o) => o.type === 'boolean').map((o) => o.name),
      alias
    });

    for (const shortcut of Object.keys(alias)) {
      delete argv[shortcut];
    }

    for (const command of this.commands) {
      if (command.shouldRun(argv)) {
        return command.parseArgs(argv);
      }
    }

    const argumentss = argv['_'];
    const options: Record<string, string> = argv;
    delete options['_'];

    return {
      command: undefined,
      arguments: argumentss,
      options
    };
  }

  async run(args: string[]) {
    const parsed = this.parse(args);
    if (parsed.command) {
      parsed.command.run(...parsed.arguments, parsed.options);
    }
  }
}
