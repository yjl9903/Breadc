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
 */
export class Option {
  private static BooleanRE = /^(-[a-zA-Z], )?--[a-zA-Z.]+$/;
  private static NameRE = /--([a-zA-Z.]+)/;
  private static ShortcutRE = /^-([a-zA-Z])/;

  readonly name: string;
  readonly shortcut?: string;
  readonly description: string;
  readonly type: 'string' | 'boolean';

  readonly construct: (rawText: string | undefined) => any;

  constructor(format: string, config: OptionConfig = {}) {
    if (Option.BooleanRE.test(format)) {
      this.type = 'boolean';
    } else {
      this.type = 'string';
    }

    {
      // Extract option name, i.e. --root => root
      const match = Option.NameRE.exec(format);
      if (match) {
        this.name = match[1];
      } else {
        throw new Error(`Can not extract option name from "${format}"`);
      }
    }
    {
      // Extract option shortcut, i.e. -r => r
      const match = Option.ShortcutRE.exec(format);
      if (match) {
        this.shortcut = match[1];
      }
    }

    this.description = config.description ?? '';
    this.construct = config.construct ?? ((text) => text ?? config.default ?? undefined);
  }
}
