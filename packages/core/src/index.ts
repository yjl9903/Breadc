export type {
  Breadc,
  BreadcInit,
  Group,
  GroupInit,
  Option,
  OptionInit,
  Command,
  CommandInit,
  Argument,
  ArgumentInit
} from './breadc/index.ts';

export type { UnknownCommandMiddleware, UnknownOptionMiddleware, ActionMiddleware } from './breadc/types/middleware.ts';

export type { Context } from './runtime/context.ts';

export { breadc, group, option, command, argument } from './breadc/index.ts';

export { printHelp } from './breadc/builtin/help.ts';

export { printVersion } from './breadc/builtin/version.ts';

export { MatchedArgument, MatchedOption, type MatchedUnknownOption } from './runtime/matched.ts';

export { BreadcError, DefinitionError, InputError, InternalError, ErrorCode } from './error.ts';

export type { BreadcErrorOptions, InputIssue } from './error.ts';
