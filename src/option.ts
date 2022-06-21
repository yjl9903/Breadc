export interface OptionConfig<T = string> {
  description?: string;
  default?: T;
  construct?: (rawText?: string) => T;
}

/**
 * Option
 *
 * Option format must follow:
 * + --option
 * + -o, --option
 * + --option <arg>
 * + --option [arg]
 */
export class Option<T extends string = string, F = string> {
  private static OptionRE = /^(-[a-zA-Z], )?--([a-zA-Z.]+)( \[[a-zA-Z]+\]| <[a-zA-Z]+>)?$/;

  readonly name: string;
  readonly shortcut?: string;
  readonly default?: F;
  readonly format: string;
  readonly description: string;
  readonly type: 'string' | 'boolean';
  readonly required: boolean;

  readonly construct: (rawText: string | undefined) => any;

  constructor(format: T, config: OptionConfig<F> = {}) {
    this.format = format;

    const match = Option.OptionRE.exec(format);
    if (match) {
      if (match[3]) {
        this.type = 'string';
      } else {
        this.type = 'boolean';
      }
      this.name = match[2];
      if (match[1]) {
        this.shortcut = match[1][1];
      }
    } else {
      throw new Error(`Can not parse option format from "${format}"`);
    }

    this.description = config.description ?? '';
    this.required = format.indexOf('<') !== -1;
    this.default = config.default;
    this.construct = config.construct ?? ((text) => text ?? config.default ?? undefined);
  }
}
