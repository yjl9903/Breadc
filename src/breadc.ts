import minimist from 'minimist';

export class Breadc {
  private readonly name: string;
  private readonly version: string;

  private readonly options: BreadcOption[] = [];

  constructor(name: string, option: { version: string }) {
    this.name = name;
    this.version = option.version;
  }

  option(text: string) {
    try {
      const option = new BreadcOption(text);
      this.options.push(option);
    } catch (error) {
      // Handle warning
    }
    return this;
  }

  command(text: string) {
    return new Breadcommand(this, text);
  }

  parse(args: string[]) {
    const argv = minimist(args, {
      string: this.options.filter((o) => o.type === 'string').map((o) => o.name),
      boolean: this.options.filter((o) => o.type === 'boolean').map((o) => o.name)
    });
    return argv;
  }
}

class Breadcommand {
  private readonly breadc: Breadc;

  constructor(breadc: Breadc, text: string) {
    this.breadc = breadc;
  }
}

class BreadcOption {
  private static BooleanRE = /^--[a-zA-Z.]+$/;
  private static NameRE = /--([a-zA-Z.]+)/;

  readonly name: string;
  readonly type: 'string' | 'boolean';

  constructor(text: string) {
    if (BreadcOption.BooleanRE.test(text)) {
      this.type = 'boolean';
    } else {
      this.type = 'string';
    }

    const match = BreadcOption.NameRE.exec(text);
    if (match) {
      this.name = match[1];
    } else {
      throw new Error(`Can not extract option name from "${text}"`);
    }
  }
}
