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
  /* c8 ignore next 1 */
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
    return this.cursor < this.rawArgs.length;
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
          value: value !== undefined ? new Token(value) : undefined,
          done: that.cursor > that.rawArgs.length
        } as IteratorYieldResult<Token> | IteratorReturnResult<undefined>;
      }
    };
  }
}
