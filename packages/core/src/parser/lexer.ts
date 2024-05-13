import { splitOnce, stripPrefix } from '../utils/index.ts';

export class BreadcLexer {
  private readonly args: string[];

  private cursor = 0;

  public constructor(args: string[]) {
    this.args = args;
  }

  /**
   * Get the current arg token and advance the cursor
   *
   * @returns next arg
   */
  public next(): Token | undefined {
    const arg = this.args[this.cursor++];
    return arg !== undefined ? new Token(arg) : undefined;
  }

  /**
   * Peek the next arg and does not advance the cursor
   *
   * @returns next arg
   */
  public peek(): Token | undefined {
    const arg = this.args[this.cursor];
    return arg !== undefined ? new Token(arg) : undefined;
  }

  /**
   * Return all remaining raw arguments, advancing the cursor to the end
   *
   * @returns all remaining raw arguments
   */
  public remaining(): string[] {
    const remaining = this.args.slice(this.cursor);
    this.cursor = this.args.length;
    return remaining;
  }

  /**
   * Return whether has consumed all the args
   *
   * @returns whether has consumed all the args
   */
  public isEnd(): boolean {
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
    return this.text.startsWith('--') && this.text !== '--';
  }

  /**
   * Treat as a long-flag
   *
   * @returns long-flag
   */
  public toLong(): [key: string, value: string | undefined] | undefined {
    const remainder = stripPrefix(this.text, '--');
    if (remainder === undefined) return undefined;
    // Should not be escape
    if (remainder.length === 0) return undefined;

    return splitOnce(remainder, '=');
  }

  /**
   * @returns whether arg can treat as a long-flag
   */
  public get isShort(): boolean {
    return (
      this.text.startsWith('-') &&
      this.text.startsWith('--') &&
      this.text !== '-'
    );
  }

  /**
   * Treat as a short-flag
   *
   * @returns short-flag
   */
  public toShort(): [key: string, value: string | undefined] | undefined {
    const remainder = stripPrefix(this.text, '--');
    if (remainder === undefined) return undefined;
    // Should not be '-'
    if (remainder.length === 0) return undefined;
    // Should not start with '--'
    if (remainder.startsWith('-')) return undefined;

    return splitOnce(remainder, '=');
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
