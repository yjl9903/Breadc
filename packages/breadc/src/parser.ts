import type { ParseResult, Command, Option } from './types';

import { camelCase } from './utils';
import { ParseError } from './error';

export type TokenType = '--' | '-' | 'number' | 'string' | 'long' | 'short';

export class Token {
  private readonly text: string;

  private _type!: TokenType;

  constructor(text: string) {
    this.text = text;
  }

  /**
   * @returns Raw argument text
   */
  public raw(): string {
    return this.text;
  }

  /**
   * @returns Number representation
   */
  public number(): number {
    return Number(this.text);
  }

  /**
   * @returns Remove start - for long or short option
   */
  public option(): string {
    return this.text.replace(/^-+/, '');
  }

  public isOption(): boolean {
    return this.type() === 'long' || this._type === 'short';
  }

  public isText(): boolean {
    return this.type() === 'number' || this._type === 'string';
  }

  public type() {
    if (this._type) {
      return this._type;
    } else if (this.text === '--') {
      return (this._type = '--');
    } else if (this.text === '-') {
      return (this._type = '-');
    } else if (!isNaN(Number(this.text))) {
      return (this._type = 'number');
    } else if (this.text.startsWith('--')) {
      return (this._type = 'long');
    } else if (this.text.startsWith('-')) {
      return (this._type = 'short');
    } else {
      return (this._type = 'string');
    }
  }
}

export class Lexer {
  private readonly rawArgs: string[];

  private cursor: number = 0;

  constructor(rawArgs: string[]) {
    this.rawArgs = rawArgs;
  }

  public next(): Token | undefined {
    const value = this.rawArgs[this.cursor];
    this.cursor += 1;
    return value ? new Token(value) : undefined;
  }

  public hasNext(): boolean {
    return this.cursor + 1 < this.rawArgs.length;
  }

  public peek(): Token | undefined {
    const value = this.rawArgs[this.cursor];
    return value ? new Token(value) : undefined;
  }

  [Symbol.iterator](): Iterator<Token, undefined> {
    const that = this;
    return {
      next() {
        const value = that.rawArgs[that.cursor];
        that.cursor += 1;
        return {
          value: value ? new Token(value) : undefined,
          done: that.cursor > that.rawArgs.length
        } as IteratorYieldResult<Token> | IteratorReturnResult<undefined>;
      }
    };
  }
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

export function makeTreeNode(pnode: Partial<TreeNode>): TreeNode {
  const node: TreeNode = {
    children: new Map(),
    init() {},
    next(token, context) {
      const t = token.raw();
      context.result['--'].push(t);
      if (node.children.has(t)) {
        const next = node.children.get(t)!;
        next.init(context);
        return next;
      } else {
        return node;
      }
    },
    finish() {},
    ...pnode
  };
  return node;
}

export function parseOption(token: Token, context: Context) {
  const o = token.option();
  const [key, rawV] = o.split('=');
  if (context.options.has(key)) {
    const option = context.options.get(key)!;
    const name = camelCase(option.name);
    if (option.type === 'boolean') {
      context.result.options[name] = !key.startsWith('no-') ? true : false;
    } else if (option.type === 'string') {
      if (rawV !== undefined) {
        context.result.options[name] = rawV;
      } else {
        const value = context.lexer.next();
        if (value === undefined || value.isOption()) {
          throw new ParseError(
            `You should provide arguments for ${option.format}`
          );
        } else {
          context.result.options[name] = value.raw();
        }
      }
    } else {
      throw new ParseError('unimplemented');
    }
  } else {
    throw new ParseError(`Unknown option ${token.raw()}`);
  }
}

export function parse(root: TreeNode, args: string[]) {
  const lexer = new Lexer(args);
  const context: Context = {
    lexer,
    options: new Map(),
    result: {
      arguments: [],
      options: {},
      '--': []
    }
  };

  let cursor = root;
  root.init(context);

  for (const token of lexer) {
    if (token.type() === '--') {
      break;
    } else if (token.isOption()) {
      parseOption(token, context);
    } else if (token.isText()) {
      const res = cursor.next(token, context);
      if (res === false) {
        break;
      } else {
        cursor = res;
      }
    } else {
      throw new ParseError('unreachable');
    }
  }

  cursor.finish(context);
  for (const token of lexer) {
    context.result['--'].push(token.raw());
  }

  return {
    command: cursor.command,
    arguments: context.result.arguments,
    options: context.result.options,
    '--': context.result['--']
  };
}
