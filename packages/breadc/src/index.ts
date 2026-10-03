export type { BreadcInit } from './types.ts';

export { breadc } from './app.ts';

export { printHelp } from './builtin/help.ts';

export { printVersion } from './builtin/version.ts';

export type {
  Example,
  AppDescription,
  CommandDescription,
  Cast,
  InferCastOutput,
  BreadcErrorOptions,
  InputIssue,
  Breadc,
  Group,
  GroupInit,
  Option,
  OptionInit,
  OptionActionInit,
  Command,
  CommandInit,
  Argument,
  ArgumentInit,
  Context,
  UnknownCommandMiddleware,
  UnknownOptionMiddleware,
  ActionMiddleware
} from '@breadc/core';

export {
  parse,
  run,
  group,
  option,
  command,
  argument,
  BreadcError,
  DefinitionError,
  InputError,
  InternalError,
  ErrorCode
} from '@breadc/core';

export * from '@breadc/death';

export * from '@breadc/tui';

export {
  reset,
  bold,
  dim,
  italic,
  underline,
  inverse,
  hidden,
  strikethrough,
  black,
  red,
  green,
  yellow,
  blue,
  magenta,
  cyan,
  white,
  gray,
  lightRed,
  lightGreen,
  lightYellow,
  lightBlue,
  lightMagenta,
  lightCyan,
  lightGray,
  bgBlack,
  bgRed,
  bgGreen,
  bgYellow,
  bgBlue,
  bgMagenta,
  bgCyan,
  bgWhite,
  bgGray,
  bgLightRed,
  bgLightGreen,
  bgLightYellow,
  bgLightBlue,
  bgLightMagenta,
  bgLightCyan,
  bgLightGray,
  ansi256,
  ansi256Bg,
  link
} from '@breadc/color';
