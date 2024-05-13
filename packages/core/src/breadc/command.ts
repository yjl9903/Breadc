export class Command<F extends string = string> {
  public readonly format: F;

  public constructor(format: F) {
    this.format = format;
  }

  /**
   * This is used internal, you should not use this API.
   *
   * @returns this
   */
  public resolve(): this {
    return this;
  }

  /**
   * Bind the action function
   *
   * @param fn action function
   * @returns this
   */
  public action(fn: Function): this {
    // TODO
    return this;
  }
}

/**
 * Support 3 kinds of arguments
 *
 * - [optional]
 * - <required>
 * - [...remaining]
 */
export class Argument {
  public readonly required: boolean = false;

  public readonly remaining: boolean = false;
}
