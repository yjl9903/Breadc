import type { AppOption, Logger } from './types';

import minimist, { ParsedArgs } from 'minimist';

import { createDefaultLogger } from './logger';

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

    this.commands = [
      new Command(this, 'help', {
        condition(args) {
          const isEmpty = !args['_'].length && !args['--']?.length;
          if (args.help && isEmpty) {
            return true;
          } else if (args.h && isEmpty) {
            return true;
          } else {
            return false;
          }
        }
      }).action(() => {
        this.logger.println('Help');
      }),
      new Command(this, 'version', {
        condition(args) {
          const isEmpty = !args['_'].length && !args['--']?.length;
          if (args.version && isEmpty) {
            return true;
          } else if (args.v && isEmpty) {
            return true;
          } else {
            return false;
          }
        }
      }).action(() => {
        this.logger.println(`${name}/${this.version}`);
      })
    ];
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
    const command = new Command(this, format, config);
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

class Command {
  private readonly breadc: Breadc;
  private readonly conditionFn?: ConditionFn;

  readonly prefix: string;
  readonly description: string;

  private actionFn?: () => void;

  constructor(
    breadc: Breadc,
    format: string,
    config: CommandConfig & { condition?: ConditionFn } = {}
  ) {
    this.breadc = breadc;
    this.prefix = format;
    this.description = config.description ?? '';
    this.conditionFn = config.condition;
  }

  checkCommand(args: ParsedArgs) {
    if (this.conditionFn) {
      return this.conditionFn(args);
    } else {
      return false;
    }
  }

  action(fn: () => void) {
    this.actionFn = fn;
    return this;
  }

  async run() {
    this.actionFn && this.actionFn();
  }
}

type ConditionFn = (args: ParsedArgs) => boolean;

interface CommandConfig {
  description?: string;
}

/**
 * Option
 *
 * Option format must follow:
 * + --option
 * + -o, --option
 */
class Option {
  private static BooleanRE = /^(-[a-zA-Z], )?--[a-zA-Z.]+$/;
  private static NameRE = /--([a-zA-Z.]+)/;
  private static ShortcutRE = /^-([a-zA-Z])/;

  readonly name: string;
  readonly shortcut?: string;
  readonly description: string;
  readonly type: 'string' | 'boolean';

  readonly construct: (rawText: string | undefined) => any;

  constructor(format: string, config: OptionConfig = {}) {
    if (Option.BooleanRE.test(format)) {
      this.type = 'boolean';
    } else {
      this.type = 'string';
    }

    {
      // Extract option name, i.e. --root => root
      const match = Option.NameRE.exec(format);
      if (match) {
        this.name = match[1];
      } else {
        throw new Error(`Can not extract option name from "${format}"`);
      }
    }
    {
      // Extract option shortcut, i.e. -r => r
      const match = Option.ShortcutRE.exec(format);
      if (match) {
        this.shortcut = match[1];
      }
    }

    this.description = config.description ?? '';
    this.construct = config.construct ?? ((text) => text ?? config.default ?? undefined);
  }
}

interface OptionConfig<T = string> {
  description?: string;
  default?: T;
  construct?: (rawText?: string) => T;
}
