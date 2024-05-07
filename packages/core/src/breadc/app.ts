export class Breadc {
  private _name: string;

  private _version: string | undefined = undefined;

  private _description: string | undefined = undefined;

  public constructor(name: string) {
    this._name = name;
  }

  public version(version: string): this {
    this._version = version;
    return this;
  }

  public description(description: string): this {
    this._description = description;
    return this;
  }

  public parse(args: string[]) {}

  public async run(args: string[]) {}
}
