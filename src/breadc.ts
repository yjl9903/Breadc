import type { AppOption, Logger } from './types';

import minimist from 'minimist';

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
  }

  option(text: string) {
    try {
      const option = new Option(text);
      this.options.push(option);
    } catch (error: any) {
      this.logger.warn(error.message);
    }
    return this;
  }

  command(text: string) {
    return new Command(this, text);
  }

  parse(args: string[]) {
    const argv = minimist(args, {
      string: this.options.filter((o) => o.type === 'string').map((o) => o.name),
      boolean: this.options.filter((o) => o.type === 'boolean').map((o) => o.name)
    });
    return argv;
  }
}

class Command {
  private readonly breadc: Breadc;

  constructor(breadc: Breadc, text: string) {
    this.breadc = breadc;
  }
}

class Option {
  private static BooleanRE = /^--[a-zA-Z.]+$/;
  private static NameRE = /--([a-zA-Z.]+)/;

  readonly name: string;
  readonly type: 'string' | 'boolean';

  constructor(text: string) {
    if (Option.BooleanRE.test(text)) {
      this.type = 'boolean';
    } else {
      this.type = 'string';
    }

    const match = Option.NameRE.exec(text);
    if (match) {
      this.name = match[1];
    } else {
      throw new Error(`Can not extract option name from "${text}"`);
    }
  }
}
