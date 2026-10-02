import type { BreadcInit as CoreBreadcInit } from '@breadc/core';

export type BreadcInit = CoreBreadcInit & {
  /**
   * Language used by the builtin help output
   *
   * @default 'en'
   */
  i18n?: 'en' | 'zh';

  /**
   * Logger
   */
  // logger?: LoggerInit;

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

          /**
           *
           */
          description?: string;
        };

    help?:
      | boolean
      | {
          /**
           * @default '-h, --help'
           */
          spec?: string;

          /**
           *
           */
          description?: string;
        };
  };
};
