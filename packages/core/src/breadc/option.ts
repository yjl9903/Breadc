export class Option<F extends string = string> {
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
}
