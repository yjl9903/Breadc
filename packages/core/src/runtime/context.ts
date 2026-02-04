import type {
  InternalBreadc,
  InternalGroup,
  InternalCommand
} from '../breadc/types/index.ts';

import type { MatchedArgument, MatchedOption } from './matched.ts';

import { TokenStream } from './lexer.ts';

export type Context<Data extends {} = {}, Return extends unknown = unknown> = {
  /**
   * Data used in the command action
   */
  data: Data;

  /**
   * Output of the command action
   */
  output?: Return;

  /**
   * Matched commands or groups, sorted by appearance order
   */
  group?: InternalGroup;

  /**
   * Matched command
   */
  command?: InternalCommand;

  /**
   * Match command pieces
   */
  readonly pieces: string[];

  /**
   * Matched options
   */
  readonly options: Map<string, MatchedOption>;

  /**
   * Matched arguments
   */
  readonly arguments: MatchedArgument[];

  /**
   * Remaing arguments
   */
  readonly remaining: string[];

  /**
   * Breadc app instance
   */
  readonly breadc: InternalBreadc;

  /**
   * Input token stream
   */
  readonly tokens: TokenStream;
};

export function context<Data extends {} = {}, Return extends unknown = unknown>(
  breadc: InternalBreadc,
  args: string[]
): Context<Data, Return> {
  return {
    data: {} as Data,
    output: undefined,
    group: undefined,
    command: undefined,
    pieces: [],
    options: new Map(),
    arguments: [],
    remaining: [],
    breadc,
    tokens: new TokenStream(args)
  };
}

export function reset<Data extends {} = {}, Return extends unknown = unknown>(
  context: Context<Data, Return>
): Context<Data, Return> {
  context.data = {} as Data;
  context.group = undefined;
  context.command = undefined;
  context.pieces.length = 0;
  context.options.clear();
  context.arguments.length = 0;
  context.remaining.length = 0;
  context.tokens.reset();
  return context;
}
