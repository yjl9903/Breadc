import { camelCase } from '../utils';
import { ParseError } from '../error';

import type { Context, TreeNode } from './types';

import { Lexer, Token } from './lexer';

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

export function parseOption(
  cursor: TreeNode,
  token: Token,
  context: Context
): TreeNode | false {
  const o = token.option();
  const [key, rawV] = o.split('=');
  if (context.options.has(key)) {
    const option = context.options.get(key)!;
    const name = camelCase(option.name);

    if (option.action) {
      return option.action(cursor, token, context);
    } else if (option.type === 'boolean') {
      context.result.options[name] = !key.startsWith('no-') ? true : false;
    } else if (option.type === 'string') {
      if (rawV !== undefined) {
        context.result.options[name] = rawV;
      } else {
        const value = context.lexer.next();
        if (value !== undefined && !value.isOption()) {
          context.result.options[name] = value.raw();
        } else {
          throw new ParseError(
            `You should provide arguments for ${option.format}`
          );
        }
      }
      /* c8 ignore next 3 */
    } else {
      throw new ParseError('unreachable');
    }

    if (option.cast) {
      context.result.options[name] = option.cast(context.result.options[name]);
    }
  } else {
    throw new ParseError(`Unknown option ${token.raw()}`);
  }
  return cursor;
  /* c8 ignore next 1 */
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
      const res = parseOption(cursor, token, context);
      /* c8 ignore next 2 */
      if (res === false) {
        break;
      } else {
        cursor = res;
      }
    } else if (token.isText()) {
      const res = cursor.next(token, context);
      if (res === false) {
        break;
      } else {
        cursor = res;
      }
      /* c8 ignore next 3 */
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
