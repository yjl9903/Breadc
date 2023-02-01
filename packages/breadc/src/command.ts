import type { ParsedArgs } from 'minimist';

import * as kolorist from 'kolorist';

import type {
  ActionFn,
  ExtractCommand,
  ExtractOption,
  Logger,
  ParseResult
} from './types';

import { Option, OptionConfig } from './option';

export interface CommandConfig {
  description?: string;
}

export class Command<
  F extends string = string,
  CommandOption extends object = {}
> {
  protected static MaxDep = 5;

  protected readonly logger: Logger;

  readonly format: string;
  readonly description: string;

  readonly prefix: string[][];
  readonly arguments: string[];
  readonly default: boolean;
  readonly options: Option[] = [];

  private actionFn?: ActionFn<ExtractCommand<F>, CommandOption>;

  constructor(format: F, config: CommandConfig & { logger: Logger }) {
    this.format = format;

    const pieces = format
      .split(' ')
      .map((t) => t.trim())
      .filter(Boolean);
    const prefix = pieces.filter((p) => !isArg(p));
    this.default = prefix.length === 0;
    this.prefix = this.default ? [] : [prefix];
    this.arguments = pieces.filter(isArg);

    this.description = config.description ?? '';
    this.logger = config.logger;

    {
      const restArgs = this.arguments.findIndex((a) => a.startsWith('[...'));
      if (restArgs !== -1 && restArgs !== this.arguments.length - 1) {
        this.logger.warn(
          `Expand arguments ${this.arguments[restArgs]} should be placed at the last position`
        );
      }
      if (pieces.length > Command.MaxDep) {
        this.logger.warn(`Command format string "${format}" is too long`);
      }
    }
  }

  get isInternal(): boolean {
    return this instanceof InternalCommand;
  }

  alias(command: string) {
    const pieces = command
      .split(' ')
      .map((t) => t.trim())
      .filter(Boolean);
    this.prefix.push(pieces);
    return this;
  }

  option<OF extends string, T = undefined>(
    format: OF,
    description: string,
    config?: Omit<OptionConfig<OF, T>, 'description'>
  ): Command<F, CommandOption & ExtractOption<OF, T>>;

  option<OF extends string, T = undefined>(
    format: OF,
    config?: OptionConfig<OF, T>
  ): Command<F, CommandOption & ExtractOption<OF, T>>;

  option<OF extends string, T = undefined>(
    format: OF,
    configOrDescription: OptionConfig<OF, T> | string = '',
    otherConfig: Omit<OptionConfig<OF, T>, 'description'> = {}
  ): Command<F, CommandOption & ExtractOption<OF, T>> {
    const config: OptionConfig<OF, T> =
      typeof configOrDescription === 'object'
        ? configOrDescription
        : { ...otherConfig, description: configOrDescription };

    try {
      const option = new Option<OF, T>(format, config);
      this.options.push(option as unknown as Option);
    } catch (error: any) {
      this.logger.warn(error.message);
    }
    return this as Command<F, CommandOption & ExtractOption<OF, T>>;
  }

  hasPrefix(parsedArgs: ParsedArgs) {
    const argv = parsedArgs['_'];
    if (argv.length === 0) {
      return this.default;
    } else {
      for (const prefix of this.prefix) {
        if (prefix.length > 0 && prefix[0] === argv[0]) {
          return true;
        }
      }
      return false;
    }
  }

  shouldRun(parsedArgs: ParsedArgs) {
    const args = parsedArgs['_'];
    for (const prefix of this.prefix) {
      let match = true;
      for (let i = 0; match && i < prefix.length; i++) {
        if (args[i] !== prefix[i]) {
          match = false;
        }
      }
      if (match) {
        // SideEffect: remove args prefix
        args.splice(0, prefix.length);
        return true;
      }
    }
    if (this.default) return true;
    return false;
  }

  parseArgs(argv: ParsedArgs, globalOptions: Option[]): ParseResult {
    const pieces = argv['_'];
    const args: any[] = [];
    const restArgs: any[] = [];

    for (let i = 0, used = 0; i <= this.arguments.length; i++) {
      if (i === this.arguments.length) {
        // Pass the rest arguments
        restArgs.push(...pieces.slice(used).map(String));
        restArgs.push(...(argv['--'] ?? []).map(String));
      } else if (i < pieces.length) {
        if (this.arguments[i].startsWith('[...')) {
          args.push(pieces.slice(i).map(String));
          used = pieces.length;
        } else {
          args.push(String(pieces[i]));
          used++;
        }
      } else {
        if (this.arguments[i].startsWith('<')) {
          this.logger.warn(
            `You should provide the argument "${this.arguments[i]}"`
          );
          args.push('');
        } else if (this.arguments[i].startsWith('[...')) {
          args.push([]);
        } else if (this.arguments[i].startsWith('[')) {
          args.push(undefined);
        } else {
          this.logger.warn(`unknown format string ("${this.arguments[i]}")`);
        }
      }
    }

    const fullOptions = globalOptions.concat(this.options).reduce((map, o) => {
      map.set(o.name, o);
      return map;
    }, new Map<string, Option>());
    const options: Record<string, any> = argv;
    delete options['_'];

    for (const [name, rawOption] of fullOptions) {
      if (rawOption.type === 'boolean') continue;

      if (rawOption.required) {
        if (options[name] === undefined) {
          options[name] = false;
        } else if (options[name] === '') {
          options[name] = true;
        }
      } else {
        if (options[name] === false) {
          options[name] = undefined;
        } else if (!(name in options)) {
          options[name] = undefined;
        }
      }

      if (rawOption.construct !== undefined) {
        // @ts-ignore
        options[name] = rawOption.construct(options[name]);
      } else if (rawOption.default !== undefined) {
        if (
          options[name] === undefined ||
          options[name] === false ||
          options[name] === ''
        ) {
          options[name] = rawOption.default;
        }
      }
    }
    for (const key of Object.keys(options)) {
      if (!fullOptions.has(key)) {
        delete options[key];
      }
    }

    return {
      // @ts-ignore
      command: this,
      arguments: args,
      options,
      '--': restArgs
    };
  }

  action(fn: ActionFn<ExtractCommand<F>, CommandOption>) {
    this.actionFn = fn;
  }

  async run(...args: any[]) {
    if (this.actionFn) {
      // @ts-ignore
      return await this.actionFn(...args, {
        logger: this.logger,
        color: kolorist
      });
    } else {
      this.logger.warn(
        `You may miss action function in ${
          this.format ? `"${this.format}"` : '<default command>'
        }`
      );
      return undefined;
    }
  }
}

class InternalCommand extends Command<string> {
  hasPrefix(_args: ParsedArgs): boolean {
    return false;
  }

  parseArgs(args: ParsedArgs, _globalOptions: Option[]): ParseResult {
    const argumentss: any[] = args['_'];
    const options: Record<string, string> = args;
    delete options['_'];
    delete options['help'];
    delete options['version'];

    return {
      // @ts-ignore
      command: this,
      arguments: argumentss,
      options: args,
      '--': []
    };
  }
}

type HelpFn = (commands: Command[]) => string[];

export class HelpCommand extends InternalCommand {
  private readonly commands: Command[];
  private readonly help: HelpFn;

  private readonly runCommands: Command[] = [];
  private readonly helpCommands: Command[] = [];

  constructor(commands: Command[], help: HelpFn, logger: Logger) {
    super('-h, --help', { description: 'Display this message', logger });
    this.commands = commands;
    this.help = help;
  }

  shouldRun(args: ParsedArgs) {
    const isRestEmpty = !args['--']?.length;
    if ((args.help || args.h) && isRestEmpty) {
      if (args['_'].length > 0) {
        for (const cmd of this.commands) {
          if (!cmd.default && !cmd.isInternal) {
            if (cmd.shouldRun(args)) {
              this.runCommands.push(cmd);
            } else if (cmd.hasPrefix(args)) {
              this.helpCommands.push(cmd);
            }
          }
        }
      }
      return true;
    } else {
      return false;
    }
  }

  async run() {
    const shouldHelp =
      this.runCommands.length > 0 ? this.runCommands : this.helpCommands;
    for (const line of this.help(shouldHelp)) {
      this.logger.println(line);
    }
    this.runCommands.splice(0);
    this.helpCommands.splice(0);
  }
}

export class VersionCommand extends InternalCommand {
  private readonly version: string;

  constructor(version: string, logger: Logger) {
    super('-v, --version', { description: 'Display version number', logger });
    this.version = version;
  }

  shouldRun(args: ParsedArgs) {
    const isEmpty = !args['_'].length && !args['--']?.length;
    if (args.version && isEmpty) {
      return true;
    } else if (args.v && isEmpty) {
      return true;
    } else {
      return false;
    }
  }

  async run() {
    this.logger.println(this.version);
  }
}

function isArg(arg: string) {
  return (
    (arg[0] === '[' && arg[arg.length - 1] === ']') ||
    (arg[0] === '<' && arg[arg.length - 1] === '>')
  );
}
