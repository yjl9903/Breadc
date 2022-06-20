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
  private static MaxDep = 4;

  private readonly conditionFn?: ConditionFn;
  private readonly logger: Logger;

  readonly format: string[];
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
    this.description = config.description ?? '';
    this.conditionFn = config.condition;
    this.logger = config.logger;
  }

  option<OF extends string>(
    format: OF,
    config: OptionConfig = {}
  ): Command<F, GlobalOption, CommandOption | ExtractOption<OF>> {
    try {
      const option = new Option(format, config);
      this.options.push(option);
    } catch (error: any) {
      this.logger.warn(error.message);
    }
    return this as Command<F, GlobalOption, CommandOption | ExtractOption<OF>>;
  }

  shouldRun(args: ParsedArgs) {
    if (this.conditionFn) {
      return this.conditionFn(args);
    } else {
      const isArg = (t: string) => t[0] !== '[' && t[0] !== '<';
      for (let i = 0; i < this.format.length; i++) {
        if (isArg(this.format[i])) {
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

    const isArg = (t: string) => t[0] !== '[' && t[0] !== '<';

    const argumentss: any[] = [];
    for (let i = 0; i < this.format.length; i++) {
      if (isArg(this.format[i])) continue;
      if (i < args['_'].length) {
        if (this.format[i].startsWith('[...')) {
          argumentss.push(args['_'].slice(i));
        } else {
          argumentss.push(args['_'][i]);
        }
      } else {
        if (this.format[i].startsWith('<')) {
          argumentss.push(undefined);
        } else if (this.format[i].startsWith('[...')) {
          argumentss.push([]);
        } else if (this.format[i].startsWith('[')) {
          argumentss.push(undefined);
        } else {
          // Unreachable
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
    // @ts-ignore
    this.actionFn && this.actionFn(...args);
  }
}

export function createVersionCommand(breadc: IBreadc): Command {
  return new Command('-h, --help', {
    condition(args) {
      const isEmpty = !args['_'].length && !args['--']?.length;
      if (args.help && isEmpty) {
        return true;
      } else if (args.h && isEmpty) {
        return true;
      } else {
        return false;
      }
    },
    logger: breadc.logger
  }).action(() => {
    breadc.logger.println('Help');
  });
}

export function createHelpCommand(breadc: IBreadc): Command {
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
    breadc.logger.println(`${breadc.name}/${breadc.version}`);
  });
}
