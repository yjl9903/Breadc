import { BreadcError } from '../error.ts';

const OptionRE =
  /^(-[a-zA-Z], )?--([a-zA-Z0-9\-]+)(?: (<[a-zA-Z0-9\-]+>|\[\.*[a-zA-Z0-9\-]+\]))?$/;

/**
 * Option abstraction
 *
 * - --long <name>
 * - -s, --long <name>
 *
 * Support argument:
 * - <required>
 * - [optional]
 * - [...remaining] (multiple options)
 */
export class Option<F extends string = string> {
  public readonly format: F;

  private resolved = false;

  public type!: 'boolean' | 'optional' | 'required' | 'array';

  public long: string = '';

  public short: string | undefined;

  public name: string | undefined;

  public constructor(format: F) {
    this.format = format;
  }

  /**
   * This is used internal, you should not use this API.
   *
   * @returns this
   */
  public resolve(): this {
    if (this.resolved) return this;

    const match = OptionRE.exec(this.format);
    if (match) {
      this.long = match[2];

      if (match[1]) {
        this.short = match[1][1];
      }

      if (match[3]) {
        this.name = match[3];
        if (this.name[0] === '<') {
          this.type = 'required';
        } else if (this.name[1] === '.') {
          this.type = 'array';
        } else {
          this.type = 'optional';
        }
      } else {
        this.type = 'boolean';
      }
    } else {
      throw new ResolveOptionError(ResolveOptionError.INVALID_OPTION, {
        format: this.format
      });
    }

    this.resolved = true;

    return this;
  }
}

export class ResolveOptionError extends BreadcError {
  static INVALID_OPTION = 'Resolving invalid option';

  public constructor(message: string, cause: { format: string }) {
    super(`${message} at the option "${cause.format}"`);
  }
}
