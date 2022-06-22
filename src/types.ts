import type { Command } from './command';
import type { Option } from './option';

export interface IBreadc {
  name: string;
  version: () => string;
  help: (command?: Command) => string[];
  logger: Logger;
  options: Option[];
  commands: Command[];
}

export interface AppOption {
  version?: string;

  description?: string | string[];

  help?: string | string[] | (() => string | string[]);

  logger?: Partial<Logger> | LoggerFn;
}

export type LoggerFn = (message: string, ...args: any[]) => void;

export interface Logger {
  println: LoggerFn;
  info: LoggerFn;
  warn: LoggerFn;
  error: LoggerFn;
  debug: LoggerFn;
}

export interface ParseResult {
  command: Command | undefined;
  arguments: any[];
  options: Record<string, string>;
}

export type ExtractOption<T extends string, D = undefined> = {
  [k in ExtractOptionName<T>]: D extends undefined ? ExtractOptionType<T> : D;
};

/**
 * Extract option name type
 *
 * Examples:
 * + const t1: ExtractOption<'--option' | '--hello'> = 'hello'
 * + const t2: ExtractOption<'-r, --root'> = 'root'
 */
export type ExtractOptionName<T extends string> =
  T extends `-${Letter}, --${infer R} [${infer U}]`
    ? R
    : T extends `-${Letter}, --${infer R} <${infer U}>`
    ? R
    : T extends `-${Letter}, --${infer R}`
    ? R
    : T extends `--${infer R} [${infer U}]`
    ? R
    : T extends `--${infer R} <${infer U}>`
    ? R
    : T extends `--${infer R}`
    ? R
    : never;

export type ExtractOptionType<T extends string> =
  T extends `-${Letter}, --${infer R} [${infer U}]`
    ? string | undefined
    : T extends `-${Letter}, --${infer R} <${infer U}>`
    ? string | boolean
    : T extends `-${Letter}, --${infer R}`
    ? boolean
    : T extends `--${infer R} [${infer U}]`
    ? string | undefined
    : T extends `--${infer R} <${infer U}>`
    ? string | boolean
    : T extends `--${infer R}`
    ? boolean
    : never;

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

type Lowercase =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z';

type Uppercase =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z';

type Letter = Lowercase | Uppercase;

type Push<T extends any[], U, R> = [...T, U, R];

type Context = { logger: Logger };

export type ActionFn<T extends any[], Option extends object = {}, R = any> = (
  ...arg: Push<T, Option, Context>
) => R | Promise<R>;

/**
 * Max Dep: 5
 *
 * Generated by: npx tsx examples/genType.ts 5
 */
export type ExtractCommand<T extends string> =
  T extends `<${infer P1}> <${infer P2}> <${infer P3}> <${infer P4}> [...${infer P5}]`
    ? [string, string, string, string, string[]]
    : T extends `<${infer P1}> <${infer P2}> <${infer P3}> <${infer P4}> [${infer P5}]`
    ? [string, string, string, string, string | undefined]
    : T extends `<${infer P1}> <${infer P2}> <${infer P3}> <${infer P4}> <${infer P5}>`
    ? [string, string, string, string, string]
    : T extends `${infer P1} <${infer P2}> <${infer P3}> <${infer P4}> [...${infer P5}]`
    ? [string, string, string, string[]]
    : T extends `${infer P1} <${infer P2}> <${infer P3}> <${infer P4}> [${infer P5}]`
    ? [string, string, string, string | undefined]
    : T extends `${infer P1} <${infer P2}> <${infer P3}> <${infer P4}> <${infer P5}>`
    ? [string, string, string, string]
    : T extends `${infer P1} ${infer P2} <${infer P3}> <${infer P4}> [...${infer P5}]`
    ? [string, string, string[]]
    : T extends `${infer P1} ${infer P2} <${infer P3}> <${infer P4}> [${infer P5}]`
    ? [string, string, string | undefined]
    : T extends `${infer P1} ${infer P2} <${infer P3}> <${infer P4}> <${infer P5}>`
    ? [string, string, string]
    : T extends `${infer P1} ${infer P2} ${infer P3} <${infer P4}> [...${infer P5}]`
    ? [string, string[]]
    : T extends `${infer P1} ${infer P2} ${infer P3} <${infer P4}> [${infer P5}]`
    ? [string, string | undefined]
    : T extends `${infer P1} ${infer P2} ${infer P3} <${infer P4}> <${infer P5}>`
    ? [string, string]
    : T extends `<${infer P1}> <${infer P2}> <${infer P3}> [...${infer P4}]`
    ? [string, string, string, string[]]
    : T extends `<${infer P1}> <${infer P2}> <${infer P3}> [${infer P4}]`
    ? [string, string, string, string | undefined]
    : T extends `<${infer P1}> <${infer P2}> <${infer P3}> <${infer P4}>`
    ? [string, string, string, string]
    : T extends `${infer P1} <${infer P2}> <${infer P3}> [...${infer P4}]`
    ? [string, string, string[]]
    : T extends `${infer P1} <${infer P2}> <${infer P3}> [${infer P4}]`
    ? [string, string, string | undefined]
    : T extends `${infer P1} <${infer P2}> <${infer P3}> <${infer P4}>`
    ? [string, string, string]
    : T extends `${infer P1} ${infer P2} <${infer P3}> [...${infer P4}]`
    ? [string, string[]]
    : T extends `${infer P1} ${infer P2} <${infer P3}> [${infer P4}]`
    ? [string, string | undefined]
    : T extends `${infer P1} ${infer P2} <${infer P3}> <${infer P4}>`
    ? [string, string]
    : T extends `${infer P1} ${infer P2} ${infer P3} [...${infer P4}]`
    ? [string[]]
    : T extends `${infer P1} ${infer P2} ${infer P3} [${infer P4}]`
    ? [string | undefined]
    : T extends `${infer P1} ${infer P2} ${infer P3} <${infer P4}>`
    ? [string]
    : T extends `<${infer P1}> <${infer P2}> [...${infer P3}]`
    ? [string, string, string[]]
    : T extends `<${infer P1}> <${infer P2}> [${infer P3}]`
    ? [string, string, string | undefined]
    : T extends `<${infer P1}> <${infer P2}> <${infer P3}>`
    ? [string, string, string]
    : T extends `${infer P1} <${infer P2}> [...${infer P3}]`
    ? [string, string[]]
    : T extends `${infer P1} <${infer P2}> [${infer P3}]`
    ? [string, string | undefined]
    : T extends `${infer P1} <${infer P2}> <${infer P3}>`
    ? [string, string]
    : T extends `${infer P1} ${infer P2} [...${infer P3}]`
    ? [string[]]
    : T extends `${infer P1} ${infer P2} [${infer P3}]`
    ? [string | undefined]
    : T extends `${infer P1} ${infer P2} <${infer P3}>`
    ? [string]
    : T extends `${infer P1} ${infer P2} ${infer P3}`
    ? []
    : T extends `<${infer P1}> [...${infer P2}]`
    ? [string, string[]]
    : T extends `<${infer P1}> [${infer P2}]`
    ? [string, string | undefined]
    : T extends `<${infer P1}> <${infer P2}>`
    ? [string, string]
    : T extends `${infer P1} [...${infer P2}]`
    ? [string[]]
    : T extends `${infer P1} [${infer P2}]`
    ? [string | undefined]
    : T extends `${infer P1} <${infer P2}>`
    ? [string]
    : T extends `${infer P1} ${infer P2}`
    ? []
    : T extends `[...${infer P1}]`
    ? [string[]]
    : T extends `[${infer P1}]`
    ? [string | undefined]
    : T extends `<${infer P1}>`
    ? [string]
    : T extends `${infer P1}`
    ? []
    : T extends ``
    ? []
    : never;

export type ExtractArgument<T extends string> = T extends `<${infer R}>`
  ? string
  : T extends `[...${infer R}]`
  ? string[]
  : T extends `[${infer R}]`
  ? string | undefined
  : never;
