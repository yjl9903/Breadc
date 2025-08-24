export { Breadc, type BreadcInit } from './breadc/app.ts';
export { Option, type OptionConfig } from './breadc/option.ts';
export {
  Command,
  Argument,
  type CommandConfig,
  type ArgumentConfig
} from './breadc/command.ts';

export { MatchedArgument, MatchedOption } from './parser/matched.ts';
export {
  Context,
  type Container,
  type ContextMetadata
} from './parser/context.ts';

export {
  BreadcError,
  RuntimeError,
  ResolveOptionError,
  ResolveCommandError
} from './error.ts';
