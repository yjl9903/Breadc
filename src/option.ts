import type { ExtractOptionType } from './types';

export interface OptionConfig<
  F extends string,
  T = never,
  O = ExtractOptionType<F>
> {
  /**
   * Option description
   */
  description?: string;

  /**
   * Option string default value
   */
  default?: O extends boolean ? boolean : string;

  /**
   * Transform option text
   */
  construct?: (rawText: ExtractOptionType<F>) => T;
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
export class Option<
  F extends string = string,
  T = string,
  O = ExtractOptionType<F>
> {
  private static OptionRE =
    /^(-[a-zA-Z0-9], )?--([a-zA-Z0-9\-]+)( \[[a-zA-Z0-9]+\]| <[a-zA-Z0-9]+>)?$/;

  readonly name: string;
  readonly shortcut?: string;
  readonly default?: O extends boolean ? boolean : string;
  readonly format: string;
  readonly description: string;
  readonly type: 'string' | 'boolean';
  readonly required: boolean;

  readonly construct?: (rawText: ExtractOptionType<F>) => T;

  constructor(format: F, config: OptionConfig<F, T, O> = {}) {
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
    this.construct = config.construct;
  }
}
