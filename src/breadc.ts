import type { AppOption, ExtractOption, Logger, ParseResult } from './types';

import minimist from 'minimist';

import { createDefaultLogger } from './logger';
import { Option, OptionConfig } from './option';
import {
  Command,
  CommandConfig,
  createHelpCommand,
  createVersionCommand
} from './command';

export class Breadc<GlobalOption extends object = {}> {
  private readonly name: string;
  private readonly _version: string;
  private readonly description?: string | string[];

  private readonly options: Option[] = [];
  private readonly commands: Command[] = [];

  private defaultCommand?: Command;

  readonly logger: Logger;

  constructor(name: string, option: AppOption) {
    this.name = name;
    this._version = option.version ?? 'unknown';
    this.description = option.description;
    this.logger = createDefaultLogger(name, option.logger);

    const breadc = {
      name: this.name,
      version: () => this.version.call(this),
      help: (command?: Command) => this.help.call(this, command),
      logger: this.logger,
      options: this.options,
      commands: this.commands
    };
    this.commands.push(createVersionCommand(breadc), createHelpCommand(breadc));
  }

  version() {
    return `${this.name}/${this._version}`;
  }

  help(command?: Command) {
    const output: string[] = [];
    const println = (msg: string) => output.push(msg);

    println(this.version());
    if (!command) {
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
    } else {
      if (command.description) {
        println('');
        println(command.description);
      }
    }

    if (!command) {
      if (this.defaultCommand) {
        println(``);
        println(`Usage:`);
        println(`  $ ${this.name} ${this.defaultCommand.format.join(' ')}`);
      }
    } else {
      println(``);
      println(`Usage:`);
      println(`  $ ${this.name} ${command.format.join(' ')}`);
    }

    if (!command && this.commands.length > 2) {
      println(``);
      println(`Commands:`);
      const commandHelps = this.commands
        .filter((c) => !c.hasConditionFn)
        .map(
          (c) =>
            [`  $ ${this.name} ${c.format.join(' ')}`, c.description] as [
              string,
              string
            ]
        );
      for (const line of twoColumn(commandHelps)) {
        println(line);
      }
    }

    println(``);
    println(`Options:`);
    const optionHelps = ([] as Array<[string, string]>).concat([
      ...(command
        ? command.options.map(
            (o) => [`  ${o.format}`, o.description] as [string, string]
          )
        : []),
      ...this.options.map(
        (o) => [`  ${o.format}`, o.description] as [string, string]
      ),
      [`  -h, --help`, `Display this message`],
      [`  -v, --version`, `Display version number`]
    ]);
    for (const line of twoColumn(optionHelps)) {
      println(line);
    }
    println(``);

    return output;
  }

  option<F extends string, T = undefined>(
    format: F,
    description: string,
    config?: Omit<OptionConfig<F, T>, 'description'>
  ): Breadc<GlobalOption & ExtractOption<F, T>>;

  option<F extends string, T = undefined>(
    format: F,
    config?: OptionConfig<F, T>
  ): Breadc<GlobalOption & ExtractOption<F, T>>;

  option<F extends string, T = undefined>(
    format: F,
    configOrDescription: OptionConfig<F, T> | string = '',
    otherConfig: Omit<OptionConfig<F, T>, 'description'> = {}
  ): Breadc<GlobalOption & ExtractOption<F, T>> {
    const config: OptionConfig<F, T> =
      typeof configOrDescription === 'object'
        ? configOrDescription
        : { ...otherConfig, description: configOrDescription };

    try {
      const option = new Option<F, T>(format, config);
      this.options.push(option as unknown as Option);
    } catch (error: any) {
      this.logger.warn(error.message);
    }
    return this as Breadc<GlobalOption & ExtractOption<F, T>>;
  }

  command<F extends string>(
    format: F,
    description: string,
    config?: Omit<CommandConfig, 'description'>
  ): Command<F, GlobalOption>;

  command<F extends string>(
    format: F,
    config?: CommandConfig
  ): Command<F, GlobalOption>;

  command<F extends string>(
    format: F,
    configOrDescription: CommandConfig | string = '',
    otherConfig: Omit<CommandConfig, 'description'> = {}
  ): Command<F, GlobalOption> {
    const config: CommandConfig =
      typeof configOrDescription === 'object'
        ? configOrDescription
        : { ...otherConfig, description: configOrDescription };

    const command = new Command(format, { ...config, logger: this.logger });
    if (command.default) {
      if (this.defaultCommand) {
        this.logger.warn('You can not have two default commands.');
      }
      this.defaultCommand = command;
    }
    this.commands.push(command);
    return command as Command<F, GlobalOption>;
  }

  parse(args: string[]): ParseResult {
    const allowOptions: Option[] = [
      ...this.options,
      ...this.commands.flatMap((c) => c.options)
    ];

    const alias = allowOptions.reduce((map: Record<string, string>, o) => {
      if (o.shortcut) {
        map[o.shortcut] = o.name;
      }
      return map;
    }, {});

    const argv = minimist(args, {
      string: allowOptions
        .filter((o) => o.type === 'string')
        .map((o) => o.name),
      boolean: allowOptions
        .filter((o) => o.type === 'boolean')
        .map((o) => o.name),
      alias,
      unknown: (t) => {
        if (t[0] !== '-') return true;
        else {
          if (['--help', '-h', '--version', '-v'].includes(t)) {
            return true;
          } else {
            this.logger.warn(`Find unknown flag "${t}"`);
            return false;
          }
        }
      }
    });

    for (const shortcut of Object.keys(alias)) {
      delete argv[shortcut];
    }

    // Try non-default command first
    for (const command of this.commands) {
      if (!command.default && command.shouldRun(argv)) {
        return command.parseArgs(argv, this.options);
      }
    }
    // Then try default command
    if (this.defaultCommand) {
      return this.defaultCommand.parseArgs(argv, this.options);
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

  private readonly callbacks = {
    pre: [] as Array<(option: GlobalOption) => void | Promise<void>>,
    post: [] as Array<(option: GlobalOption) => void | Promise<void>>
  };

  on(
    event: 'pre' | 'post',
    fn: (option: GlobalOption) => void | Promise<void>
  ) {
    this.callbacks[event].push(fn);
  }

  async run(args: string[]) {
    const parsed = this.parse(args);
    if (parsed.command) {
      await Promise.all(
        this.callbacks.pre.map((fn) => fn(parsed.options as any))
      );
      const returnValue = await parsed.command.run(
        ...parsed.arguments,
        parsed.options
      );
      await Promise.all(
        this.callbacks.post.map((fn) => fn(parsed.options as any))
      );
      return returnValue;
    }
  }
}

function twoColumn(texts: Array<[string, string]>, split = '  ') {
  const left = padRight(texts.map((t) => t[0]));
  return left.map((l, idx) => l + split + texts[idx][1]);
}

function padRight(texts: string[], fill = ' '): string[] {
  const length = texts
    .map((t) => t.length)
    .reduce((max, l) => Math.max(max, l), 0);
  return texts.map((t) => t + fill.repeat(length - t.length));
}
