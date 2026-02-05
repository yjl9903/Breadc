import type { Prettify } from '../types/utils.ts';
import type { Option, Command } from '../types/breadc.ts';

import type { Lexer, Token } from './lexer.ts';

export type CallbackFn = (result: BreadcParseResult) => any;

export interface ParseResult {
  /**
   * Arguments that will be passed to action callback
   * When parsing, this array is empty
   */
  arguments: Array<string | string[] | undefined>;

  /**
   * Options map
   */
  options: Record<string, any>;

  /**
   * Rest arguments.
   * When parsing, this contains all the non-option arguments
   */
  '--': string[];
}

export type BreadcParseResult = Prettify<
  ParseResult & {
    callback?: CallbackFn;
    meta: Record<string, any>;
    matched: { node: TreeNode; command?: Command; option?: Option };
  }
>;

export interface Context {
  /**
   * Lexer instance
   */
  lexer: Lexer;

  /**
   * Options supported in the current context
   */
  options: Map<string, Option>;

  /**
   * Parse result
   */
  result: ParseResult;

  /**
   * Some other meta information passed
   */
  meta: Record<string, any>;

  /**
   * Configuration
   */
  config: {
    allowUnknownOption: 'error' | 'skip' | 'rest';
  };

  parseOption(cursor: TreeNode, token: Token, context: Context): TreeNode | false;
}

export interface TreeNode<F extends CallbackFn = CallbackFn> {
  command?: Command;

  option?: Option;

  /**
   * Out-going edges from this node
   */
  children: Map<string, TreeNode>;

  init(context: Context): void;

  next(arg: Token, context: Context): TreeNode | false;

  finish(context: Context): F | undefined;
}
