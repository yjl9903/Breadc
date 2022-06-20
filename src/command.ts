import type { ParsedArgs } from 'minimist';

import type { IBreadc } from './types';

export type ConditionFn = (args: ParsedArgs) => boolean;

export interface CommandConfig {
  description?: string;
}

export class Command {
  private readonly conditionFn?: ConditionFn;

  readonly prefix: string;
  readonly description: string;

  private actionFn?: () => void;

  constructor(format: string, config: CommandConfig & { condition?: ConditionFn } = {}) {
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

export function createVersionCommand(breadc: IBreadc): Command {
  return new Command('help', {
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
    breadc.logger.println('Help');
  });
}

export function createHelpCommand(breadc: IBreadc): Command {
  return new Command('version', {
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
    breadc.logger.println(`${breadc.name}/${breadc.version}`);
  });
}
