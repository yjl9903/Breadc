import { BreadcError } from '../error.ts';

/**
 * Option abstraction
 *
 * - -s <name>
 * - --long <name>
 * - -s, --long <name>
 */
export class Option<F extends string = string> {
  public readonly format: F;

  private resolved = false;

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

    this.resolved = true;

    return this;
  }
}

export class ResolveOptionError extends BreadcError {
  public constructor(
    message: string,
    cause: { format: string; position: number }
  ) {
    super(
      `${message} at the option "${cause.format}", position ${cause.position}`
    );
  }
}
