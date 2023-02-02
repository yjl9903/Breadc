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

class BreadcError extends Error {}

class ParseError extends Error {}

interface Context {
  lexer: Lexer;

  options: Map<string, Option>;

  result: {
    arguments: any[];
    options: Record<string, any>;
    '--': string[];
  };
}

interface TreeNode {
  command?: Command;

  children: Map<string, TreeNode>;

  init(context: Context): void;

  next(arg: Token, context: Context): TreeNode | false;

  finish(context: Context): void;
}

function createTreeNode(pnode: Partial<TreeNode>): TreeNode {
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
      const o = token.option();
      if (context.options.has(o)) {
        const option = context.options.get(o)!;
        context.result.options[o] = true;
      } else {
        throw new ParseError(`Unknown option: ${token.raw()}`);
      }
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
    node: cursor,
    arguments: context.result.arguments,
    options: context.result.options,
    '--': context.result['--']
  };
}

export function breadc(name: string) {
  const allCommands: Command[] = [];
  const globalOptions: Option[] = [];

  const root = createTreeNode({
    init() {},
    finish() {}
  });

  const breadc: Breadc = {
    option(text): Breadc {
      const option: Option = {};
      globalOptions.push(option);
      return breadc;
    },
    command(text): Command {
      const args: Argument[] = [];
      const options: Option[] = [];

      const command: Command = {
        callback: undefined,
        arguments: args,
        option(text) {
          const option: Option = {};
          options.push(option);
          return command;
        },
        action(fn) {
          command.callback = fn;
          return breadc;
        }
      };

      const node = createTreeNode({
        command,
        init() {},
        finish(context) {
          const rest = context.result['--'];
          for (let i = 0; i < args.length; i++) {
            if (args[i].type === 'const') {
              if (rest[i] !== args[i].name) {
                throw new ParseError(`Internal`);
              }
            } else if (args[i].type === 'require') {
              if (i >= rest.length) {
                throw new ParseError(`You must provide require argument`);
              }
              context.result.arguments.push(rest[i]);
            } else if (args[i].type === 'optional') {
              context.result.arguments.push(rest[i]);
            } else if (args[i].type === 'rest') {
              context.result.arguments.push(rest.splice(i));
            }
          }
          context.result['--'] = rest.splice(args.length);
        }
      });

      {
        let cursor = root;
        // 0 -> aaa bbb
        // 1 -> aaa bbb <xxx> <yyy>
        // 2 -> aaa bbb <xxx> <yyy> [zzz]
        // 3 -> bbb bbb <xxx> <yyy> [...www]
        let state = 0;
        for (let i = 0; i < text.length; i++) {
          if (text[i] === '<') {
            if (state !== 0 && state !== 1) {
              // error here
            }

            const start = i;
            while (i < text.length && text[i] !== '>') {
              i++;
            }

            const name = text.slice(start + 1, i);
            state = 1;
            args.push({ type: 'require', name });
          } else if (text[i] === '[') {
            if (state !== 0 && state !== 1) {
              // error here
            }

            const start = i;
            while (i < text.length && text[i] !== ']') {
              i++;
            }

            const name = text.slice(start + 1, i);
            state = 2;
            if (name.startsWith('...')) {
              args.push({ type: 'rest', name });
            } else {
              args.push({ type: 'optional', name });
            }
          } else if (text[i] !== ' ') {
            if (state !== 0) {
              // error here
            }

            const start = i;
            while (i < text.length && text[i] !== ' ') {
              i++;
            }
            const name = text.slice(start, i);

            if (cursor.children.has(name)) {
              cursor = cursor.children.get(name)!;
              // console.log(text);
              // console.log(name);
              // console.log(cursor);
            } else {
              const internalNode = createTreeNode({
                next(token, context) {
                  const t = token.raw();
                  context.result['--'].push(t);
                  if (internalNode.children.has(t)) {
                    const next = internalNode.children.get(t)!;
                    next.init(context);
                    return next;
                  } else {
                    throw new ParseError(`Unknown sub-command ${t}`);
                  }
                },
                finish() {
                  throw new ParseError(`Unknown sub-command`);
                }
              });

              cursor.children.set(name, internalNode);
              cursor = internalNode;
            }

            state = 0;
            args.push({ type: 'const', name });
          }
        }

        cursor.command = command;
        if (cursor !== root) {
          for (const [key, value] of cursor.children) {
            node.children.set(key, value);
          }
          cursor.children = node.children;
          cursor.next = node.next;
          cursor.init = node.init;
          cursor.finish = node.finish;
        } else {
          // TODO: handle default command
          globalOptions.push(...options);
          cursor.finish = node.finish;
        }
      }

      allCommands.push(command);

      return command;
    },
    parse(args: string[]) {
      return parse(root, args);
    },
    async run(args: string[]) {
      const result = parse(root, args);
      const command = result.node.command;
      if (command) {
        if (command.callback) {
          return command.callback(...result.arguments, {
            ...result.options,
            '--': result['--']
          });
        }
      }
      return undefined as any;
    }
  };

  return breadc;
}

type ActionFn = (...args: any[]) => any;

interface Breadc {
  option(text: string): Breadc;

  command(text: string): Command;

  parse(args: string[]): any;

  run<T = any>(args: string[]): Promise<T>;
}

interface Command {
  callback?: ActionFn;

  arguments: Argument[];

  option(text: string): Command;

  action(fn: ActionFn): Breadc;
}

interface Option {}

type Argument =
  | { type: 'const'; name: string }
  | { type: 'require'; name: string }
  | { type: 'optional'; name: string }
  | { type: 'rest'; name: string };
