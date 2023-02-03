import type { Option, Command } from '../types/breadc';

import type { Lexer, Token } from './lexer';

export interface ParseResult {
  arguments: Array<string | string[] | undefined>;
  options: Record<string, string | boolean>;
  '--': string[];
}

export interface Context {
  lexer: Lexer;

  options: Map<string, Option>;

  result: ParseResult;
}

export interface TreeNode {
  command?: Command;

  children: Map<string, TreeNode>;

  init(context: Context): void;

  next(arg: Token, context: Context): TreeNode | false;

  finish(context: Context): void;
}
