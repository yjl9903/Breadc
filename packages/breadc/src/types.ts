export interface AppOption {
  version?: string;

  description?: string | string[];

  // help?: string | string[] | (() => string | string[]);

  // logger?: Partial<Logger> | LoggerFn;
}

export type ActionFn = (...args: any[]) => any;

export interface ParseResult {
  arguments: Array<string | string[] | undefined>;
  options: Record<string, string | boolean>;
  '--': string[];
}

export interface Breadc {
  option(
    text: string,
    option?: { description?: string; default?: string }
  ): Breadc;

  command(text: string, option?: { description?: string }): Command;

  parse(args: string[]): { command?: Command } & ParseResult;

  run<T = any>(args: string[]): Promise<T>;
}

export interface Command {
  callback?: ActionFn;

  description: string;

  arguments: Argument[];

  option(
    text: string,
    option?: { description?: string; default?: string }
  ): Command;

  action(fn: ActionFn): Breadc;
}

export interface Option<F extends string = string, T extends string = string> {
  format: F;
  name: string;
  short?: string;
  type: 'boolean' | 'string';
  default?: T;
  description: string;
}

export interface Argument {
  type: 'const' | 'require' | 'optional' | 'rest';
  name: string;
}
