import { camelCase } from '../utils';
import { ParseError } from '../error';

import type { BreadcParseResult, Context, TreeNode } from './types';

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
    finish() {
      /* c8 ignore next 1 */
      return pnode.command?.callback;
    },
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

    if (option.parse) {
      // Use custom option parser
      return option.parse(cursor, token, context);
    } else if (option.type === 'boolean') {
      // Parse boolean option
      context.result.options[name] = !key.startsWith('no-') ? true : false;
    } else if (option.type === 'string') {
      // Parse string option
      if (rawV !== undefined) {
        // Use "--key=value" format
        context.result.options[name] = rawV;
      } else {
        // Use "--key value" format
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
    switch (context.config.allowUnknownOption) {
      case 'rest':
        context.result['--'].push(token.raw());
      case 'skip':
        break;
      case 'error':
      default:
        throw new ParseError(`Unknown option ${token.raw()}`);
    }
  }
  return cursor;
  /* c8 ignore next 1 */
}

export function parse(root: TreeNode, args: string[]): BreadcParseResult {
  const lexer = new Lexer(args);
  const context: Context = {
    lexer,
    options: new Map(),
    result: {
      arguments: [],
      options: {},
      '--': []
    },
    meta: {},
    config: {
      allowUnknownOption: 'error'
    },
    parseOption
  };

  let cursor = root;
  root.init(context);

  for (const token of lexer) {
    if (token.type() === '--') {
      break;
    } else if (token.isOption()) {
      const res = context.parseOption(cursor, token, context);
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

  // Get callback
  const callback = cursor.finish(context);

  // Pass rest arguments
  for (const token of lexer) {
    context.result['--'].push(token.raw());
  }

  return {
    callback,
    matched: {
      node: cursor,
      command: cursor.command,
      option: cursor.option
    },
    meta: context.meta,
    arguments: context.result.arguments,
    options: context.result.options,
    '--': context.result['--']
  };
}
