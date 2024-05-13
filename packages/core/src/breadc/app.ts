import type { BreadcOptions } from './types.ts';

export class Breadc {
  public name: string;

  public version: string | undefined = undefined;

  public description: string | undefined = undefined;

  public constructor(name: string, options: BreadcOptions = {}) {
    this.name = name;
  }

  // --- Builder ---

  // TODO
  public option() {}

  // TODO
  public command(command: string) {}

  // TODO
  public default() {}

  // --- Parse ---

  public parse(args: string[]) {}

  public async run(args: string[]) {}
}
