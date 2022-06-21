import type { AppOption, ExtractOption, Logger, ParseResult } from './types';

import minimist from 'minimist';

import { createDefaultLogger } from './logger';
import { Option, OptionConfig } from './option';
import { Command, CommandConfig, createHelpCommand, createVersionCommand } from './command';

export class Breadc<GlobalOption extends string | never = never> {
  private readonly name: string;
  private readonly _version: string;
  private readonly description?: string | string[];

  private readonly options: Option[] = [];
  private readonly commands: Command[] = [];

  readonly logger: Logger;

  constructor(name: string, option: AppOption) {
    this.name = name;
    this._version = option.version ?? 'unknown';
    this.description = option.description;
    this.logger = option.logger ?? createDefaultLogger(name);

    const breadc = {
      name: this.name,
      version: () => this.version.call(this),
      help: () => this.help.call(this),
      logger: this.logger,
      options: this.options,
      commands: this.commands
    };
    this.commands.push(createVersionCommand(breadc), createHelpCommand(breadc));
  }

  version() {
    return `${this.name}/${this._version}`;
  }

  help() {
    const output: string[] = [];
    const println = (msg: string) => output.push(msg);

    println(this.version());

    if (this.description) {
      println('');
      if (Array.isArray(this.description)) {
        for (const line of this.description) {
          println(line);
        }
      } else {
        println(this.description);
      }
    }

    const defaultCommand = this.commands.find(
      (c) => c.format.length === 0 || c.format[0][0] === '[' || c.format[0][0] === '<'
    );
    if (defaultCommand) {
      println(``);
      println(`Usage:`);
      println(`  $ ${this.name} ${defaultCommand.format.join(' ')}`);
    }

    if (this.commands.length > 2) {
      println(``);
      println(`Commands:`);
      const commandHelps = this.commands
        .filter((c) => !c.hasConditionFn)
        .map((c) => [`  $ ${this.name} ${c.format.join(' ')}`, c.description] as [string, string]);
      for (const line of twoColumn(commandHelps)) {
        println(line);
      }
    }

    println(``);
    println(`Options:`);
    const optionHelps = this.options
      .map((o) => [`  ${o.format}`, o.description] as [string, string])
      .concat([
        [`  -h, --help`, `Display this message`],
        [`  -v, --version`, `Display version number`]
      ]);
    for (const line of twoColumn(optionHelps)) {
      println(line);
    }
    println(``);

    return output;
  }

  option<F extends string>(
    format: F,
    description: string,
    config?: Omit<OptionConfig, 'description'>
  ): Breadc<GlobalOption | ExtractOption<F>>;

  option<F extends string>(
    format: F,
    config?: OptionConfig
  ): Breadc<GlobalOption | ExtractOption<F>>;

  option<F extends string>(
    format: F,
    configOrDescription: OptionConfig | string = '',
    otherConfig: Omit<OptionConfig, 'description'> = {}
  ): Breadc<GlobalOption | ExtractOption<F>> {
    const config: OptionConfig = otherConfig;
    if (typeof configOrDescription === 'string') {
      config.description = configOrDescription;
    }
    try {
      const option = new Option(format, config);
      this.options.push(option);
    } catch (error: any) {
      this.logger.warn(error.message);
    }
    return this as Breadc<GlobalOption | ExtractOption<F>>;
  }

  command<F extends string>(
    format: F,
    description: string,
    config?: Omit<CommandConfig, 'description'>
  ): Command<F, GlobalOption>;

  command<F extends string>(format: F, config?: CommandConfig): Command<F, GlobalOption>;

  command<F extends string>(
    format: F,
    configOrDescription: CommandConfig | string = '',
    otherConfig: Omit<CommandConfig, 'description'> = {}
  ): Command<F, GlobalOption> {
    const config: CommandConfig = otherConfig;
    if (typeof configOrDescription === 'string') {
      config.description = configOrDescription;
    }
    const command = new Command(format, { ...config, logger: this.logger });
    this.commands.push(command);
    return command as Command<F, GlobalOption>;
  }

  parse(args: string[]): ParseResult {
    const allowOptions = [this.options, this.commands.map((c) => c.options)].flat() as Option[];

    const alias = allowOptions.reduce((map: Record<string, string>, o) => {
      if (o.shortcut) {
        map[o.shortcut] = o.name;
      }
      return map;
    }, {});

    const argv = minimist(args, {
      string: allowOptions.filter((o) => o.type === 'string').map((o) => o.name),
      boolean: allowOptions.filter((o) => o.type === 'boolean').map((o) => o.name),
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

function twoColumn(texts: Array<[string, string]>, split = '  ') {
  const left = padRight(texts.map((t) => t[0]));
  return left.map((l, idx) => l + split + texts[idx][1]);
}

function padRight(texts: string[], fill = ' '): string[] {
  const length = texts.map((t) => t.length).reduce((max, l) => Math.max(max, l), 0);
  return texts.map((t) => t + fill.repeat(length - t.length));
}
