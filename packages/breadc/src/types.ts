import type { BreadcInit as CoreBreadcInit } from '@breadc/core';

export interface BreadcOutput {
  /** Available display columns. Read for each help page; defaults to 80 when invalid or omitted. */
  readonly columns?: number;

  /** Write complete text, including newlines, without adding prefixes or line breaks. */
  write(text: string): void;
}

export type BreadcInit = CoreBreadcInit & {
  /**
   * Language used by the builtin help output
   *
   * @default 'en'
   */
  i18n?: 'en' | 'zh';

  /**
   * Destination and width for builtin help/version output.
   * Defaults to process.stdout when writable, otherwise console.log with an 80-column width.
   */
  output?: BreadcOutput;

  /**
   * Builtin command configuration
   */
  builtin?: {
    version?:
      | boolean
      | {
          /**
           * @default '-v, --version'
           */
          spec?: string;
        };

    help?:
      | boolean
      | {
          /**
           * @default '-h, --help'
           */
          spec?: string;
        };
  };
};
