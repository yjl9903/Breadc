import type { ParsedArgs } from 'minimist';

import type {
  ActionFn,
  ExtractCommand,
  ExtractOption,
  Logger,
  ParseResult
} from './types';

import { Option, OptionConfig } from './option';

export type ConditionFn = (args: ParsedArgs) => boolean;

export interface CommandConfig {
  description?: string;
}

export class Command<
  F extends string = string,
  CommandOption extends object = {}
> {
  private static MaxDep = 5;

  private readonly conditionFn?: ConditionFn;
  private readonly logger: Logger;

  readonly format: string[];
  readonly default: boolean;
  readonly description: string;
  readonly options: Option[] = [];

  private actionFn?: ActionFn<ExtractCommand<F>, CommandOption>;

  constructor(
    format: F,
    config: CommandConfig & { condition?: ConditionFn; logger: Logger }
  ) {
    this.format = config.condition
      ? [format]
      : format
          .split(' ')
          .map((t) => t.trim())
          .filter(Boolean);

    this.default =
      this.format.length === 0 ||
      this.format[0][0] === '[' ||
      this.format[0][0] === '<';
    this.description = config.description ?? '';
    this.conditionFn = config.condition;
    this.logger = config.logger;

    if (this.format.length > Command.MaxDep) {
      this.logger.warn(`Command format string "${format}" is too long`);
    }
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

  get hasConditionFn(): boolean {
    return !!this.conditionFn;
  }

  hasPrefix(args: ParsedArgs) {
    if (this.conditionFn) {
      return false;
    } else {
      const argv = args['_'];
      if (argv.length === 0) {
        return this.default;
      } else {
        const fmt = this.format[0];
        return (
          this.format.length > 0 &&
          fmt[0] !== '[' &&
          fmt[0] !== '<' &&
          fmt === argv[0]
        );
      }
    }
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

  parseArgs(args: ParsedArgs, globalOptions: Option[]): ParseResult {
    if (this.conditionFn) {
      const argumentss: any[] = args['_'];
      const options: Record<string, string> = args;
      delete options['_'];
      delete options['help'];
      delete options['version'];

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
          argumentss.push(args['_'].slice(i).map(String));
        } else {
          argumentss.push(String(args['_'][i]));
        }
      } else {
        if (this.format[i].startsWith('<')) {
          this.logger.warn(
            `You should provide the argument "${this.format[i]}"`
          );
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

    const fullOptions = globalOptions.concat(this.options).reduce((map, o) => {
      map.set(o.name, o);
      return map;
    }, new Map<string, Option>());
    const options: Record<string, any> = args;
    delete options['_'];

    for (const [name, rawOption] of fullOptions) {
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
      if (rawOption.construct) {
        // @ts-ignore
        options[name] = rawOption.construct(options[name]);
      } else if (rawOption.default) {
        if (!options[name]) {
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
      arguments: argumentss,
      options
    };
  }

  action(fn: ActionFn<ExtractCommand<F>, CommandOption>) {
    this.actionFn = fn;
    return this;
  }

  async run(...args: any[]) {
    if (this.actionFn) {
      // @ts-ignore
      return await this.actionFn(...args, { logger: this.logger });
    } else {
      this.logger.warn(`You may miss action function in "${this.format}"`);
    }
  }
}
