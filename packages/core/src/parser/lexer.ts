import { splitOnce, stripPrefix } from '../utils/index.ts';

export class Lexer {
  private readonly args: string[];

  private readonly tokens: Token[] = [];

  private cursor = 0;

  public constructor(args: string[]) {
    this.args = args;
  }

  public reset() {
    this.cursor = 0;
  }

  /**
   * Get the current arg token and advance the cursor
   *
   * @returns next arg
   */
  public next(): Token | undefined {
    const arg = this.args[this.cursor];
    if (arg === undefined) return undefined;
    const token =
      this.tokens[this.cursor] ?? (this.tokens[this.cursor] = new Token(arg));
    this.cursor++;
    return token;
  }

  /**
   * Peek the next arg and does not advance the cursor
   *
   * @returns next arg
   */
  public peek(): Token | undefined {
    const arg = this.args[this.cursor];
    if (arg === undefined) return undefined;
    const token = this.tokens[this.cursor];
    if (token !== undefined) return token;
    return (this.tokens[this.cursor] = new Token(arg));
  }

  /**
   * Return all remaining raw arguments, advancing the cursor to the end
   *
   * @returns all remaining raw arguments
   */
  public remaining(): Token[] {
    const remaining = this.args.slice(this.cursor).map((t) => new Token(t));
    this.cursor = this.args.length;
    return remaining;
  }

  /**
   * Return whether has consumed all the args
   *
   * @returns whether has consumed all the args
   */
  public get isEnd(): boolean {
    return this.args[this.cursor] === undefined;
  }

  public *[Symbol.iterator]() {
    for (; this.cursor < this.args.length; this.cursor++) {
      yield new Token(this.args[this.cursor]);
    }
  }
}

export class Token {
  public readonly text: string;

  public constructor(arg: string) {
    this.text = arg;
  }

  /**
   * @returns raw arg string
   */
  public toRaw(): string {
    return this.text;
  }

  // --- Parse ---

  /**
   * @returns whether arg is empty
   */
  public get isEmpty(): boolean {
    return this.text.length === 0;
  }

  /**
   * @returns whether arg looks like a stdio argument (`-`)
   */
  public get isStdio(): boolean {
    return this.text === '-';
  }

  /**
   * @returns whether arg looks like an argument escape (`--`)
   */
  public get isEscape(): boolean {
    return this.text === '--';
  }

  /**
   * @returns whether arg looks like a negative number (`-123`)
   */
  public get isNegativeNumber(): boolean {
    return (
      this.text.startsWith('-') && !Number.isNaN(Number.parseFloat(this.text))
    );
  }

  /**
   * @returns whether arg looks like a number (`123`, `-123`)
   */
  public get isNumber(): boolean {
    return !Number.isNaN(Number.parseFloat(this.text));
  }

  /**
   * @returns whether arg can treat as a long-flag
   */
  public get isLong(): boolean {
    return this.text[0] === '-' && this.text[1] === '-' && this.text.length > 2;
  }

  /**
   * Treat as a long-flag, un-checked version
   *
   * @returns a long flag and its argument
   */
  public toLong(): [key: string, value: string | undefined] | undefined {
    return splitOnce(this.text, '=');
  }

  /**
   * Treat as a long-flag, checked version
   *
   * @returns a long flag and its argument
   */
  public checkToLong(): [key: string, value: string | undefined] | undefined {
    // Should start with '--'
    if (this.text[0] !== '-') return undefined;
    if (this.text[1] !== '-') return undefined;
    // Should not be escape
    if (this.text.length <= 2) return undefined;

    return splitOnce(this.text, '=');
  }

  /**
   * @returns whether arg can treat as a long-flag
   */
  public get isShort(): boolean {
    return this.text[0] === '-' && this.text[1] !== '-' && this.text.length > 1;
  }

  /**
   * Treat as a short-flag, un-checked version
   *
   * @returns a short flag and its argument
   */
  public toShort(): [key: string, value: string | undefined] | undefined {
    return splitOnce(this.text, '=');
  }

  /**
   * Treat as a short-flag, checked version
   *
   * @returns a short flag and its argument
   */
  public checkToShort(): [key: string, value: string | undefined] | undefined {
    // Should start with '-'
    if (this.text[0] !== '-') return undefined;
    // Should not be '-'
    if (this.text.length <= 1) return undefined;
    // Should not start with '--'
    if (this.text[1] === '-') return undefined;

    return splitOnce(this.text, '=');
  }

  // --- String ---

  public get length() {
    return this.text.length;
  }

  public toString() {
    return this.text;
  }

  public [Symbol.iterator]() {
    return this.text[Symbol.iterator]();
  }
}
