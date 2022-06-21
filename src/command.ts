import type { ParsedArgs } from 'minimist';

import { Option, OptionConfig } from './option';

import type {
  ActionFn,
  ExtractCommand,
  ExtractOption,
  IBreadc,
  Logger,
  ParseResult
} from './types';

export type ConditionFn = (args: ParsedArgs) => boolean;

export interface CommandConfig {
  description?: string;
}

export class Command<
  F extends string = string,
  GlobalOption extends string | never = never,
  CommandOption extends string | never = never
> {
  private static MaxDep = 5;

  private readonly conditionFn?: ConditionFn;
  private readonly logger: Logger;

  readonly format: string[];
  readonly default: boolean;
  readonly description: string;
  readonly options: Option[] = [];

  private actionFn?: ActionFn<ExtractCommand<F>, GlobalOption | CommandOption>;

  constructor(format: F, config: CommandConfig & { condition?: ConditionFn; logger: Logger }) {
    this.format = config.condition
      ? [format]
      : format
          .split(' ')
          .map((t) => t.trim())
          .filter(Boolean);

    this.default =
      this.format.length === 0 || this.format[0][0] === '[' || this.format[0][0] === '<';
    this.description = config.description ?? '';
    this.conditionFn = config.condition;
    this.logger = config.logger;

    if (this.format.length > Command.MaxDep) {
      this.logger.warn(`Command format string "${format}" is too long`);
    }
  }

  option<OF extends string>(
    format: OF,
    description: string,
    config?: Omit<OptionConfig, 'description'>
  ): Command<F, GlobalOption, CommandOption | ExtractOption<OF>>;

  option<OF extends string>(
    format: OF,
    config?: OptionConfig
  ): Command<F, GlobalOption, CommandOption | ExtractOption<OF>>;

  option<OF extends string>(
    format: OF,
    configOrDescription: OptionConfig | string = '',
    otherConfig: Omit<OptionConfig, 'description'> = {}
  ): Command<F, GlobalOption, CommandOption | ExtractOption<OF>> {
    const config: OptionConfig =
      typeof configOrDescription === 'object'
        ? configOrDescription
        : { ...otherConfig, description: configOrDescription };

    try {
      const option = new Option(format, config);
      this.options.push(option);
    } catch (error: any) {
      this.logger.warn(error.message);
    }
    return this as Command<F, GlobalOption, CommandOption | ExtractOption<OF>>;
  }

  get hasConditionFn(): boolean {
    return !!this.conditionFn;
  }

  shouldRun(args: ParsedArgs) {
    if (this.conditionFn) {
      return this.conditionFn(args);
    } else {
      if (this.default) return true;
      const isCmd = (t: string) => t[0] !== '[' && t[0] !== '<';
      for (let i = 0; i < this.format.length; i++) {
        if (!isCmd(this.format[i])) {
          return true;
        }
        if (i >= args['_'].length || this.format[i] !== args['_'][i]) {
          return false;
        }
      }
      return true;
    }
  }

  parseArgs(args: ParsedArgs): ParseResult {
    if (this.conditionFn) {
      const argumentss: any[] = args['_'];
      const options: Record<string, string> = args;
      delete options['_'];

      return {
        // @ts-ignore
        command: this,
        arguments: argumentss,
        options: args
      };
    }

    const isCmd = (t: string) => t[0] !== '[' && t[0] !== '<';

    const argumentss: any[] = [];
    for (let i = 0; i < this.format.length; i++) {
      if (isCmd(this.format[i])) continue;
      if (i < args['_'].length) {
        if (this.format[i].startsWith('[...')) {
          argumentss.push(args['_'].slice(i));
        } else {
          argumentss.push(args['_'][i]);
        }
      } else {
        if (this.format[i].startsWith('<')) {
          this.logger.warn(`You should provide the argument "${this.format[i]}"`);
          argumentss.push(undefined);
        } else if (this.format[i].startsWith('[...')) {
          argumentss.push([]);
        } else if (this.format[i].startsWith('[')) {
          argumentss.push(undefined);
        } else {
          this.logger.warn(`unknown format string ("${this.format[i]}")`);
        }
      }
    }

    const options: Record<string, string> = args;
    delete options['_'];

    return {
      // @ts-ignore
      command: this,
      arguments: argumentss,
      options: args
    };
  }

  action(fn: ActionFn<ExtractCommand<F>, GlobalOption | CommandOption>) {
    this.actionFn = fn;
    return this;
  }

  async run(...args: any[]) {
    if (this.actionFn) {
      // @ts-ignore
      this.actionFn(...args);
    } else {
      this.logger.warn(`You may miss action function in "${this.format}"`);
    }
  }
}

export function createHelpCommand(breadc: IBreadc): Command {
  let helpCommand: Command | undefined = undefined;

  return new Command('-h, --help', {
    condition(args) {
      const isEmpty = !args['--']?.length;
      if ((args.help || args.h) && isEmpty) {
        if (args['_'].length > 0) {
          for (const cmd of breadc.commands) {
            if (!cmd.hasConditionFn && !cmd.default && cmd.shouldRun(args)) {
              helpCommand = cmd;
              return true;
            }
          }
        }
        return true;
      } else {
        return false;
      }
    },
    logger: breadc.logger
  }).action(() => {
    for (const line of breadc.help(helpCommand)) {
      breadc.logger.println(line);
    }
  });
}

export function createVersionCommand(breadc: IBreadc): Command {
  return new Command('-v, --version', {
    condition(args) {
      const isEmpty = !args['_'].length && !args['--']?.length;
      if (args.version && isEmpty) {
        return true;
      } else if (args.v && isEmpty) {
        return true;
      } else {
        return false;
      }
    },
    logger: breadc.logger
  }).action(() => {
    breadc.logger.println(breadc.version());
  });
}
