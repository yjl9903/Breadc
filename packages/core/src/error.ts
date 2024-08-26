import type { ICommand } from './breadc/types.ts';

import { getI18n } from './i18n.ts';

export abstract class BreadcError extends Error {}

export class RuntimeError extends Error {}

export class BreadcAppError extends BreadcError {
  static DUPLICATED_DEFAULT_COMMAND = `Find duplicated default commands`;

  static DUPLICATED_COMMAND = `Find duplicated commands`;

  static NO_ACTION_BOUND = `There is no action function bound in this command`;

  public cause: { command?: ICommand; commands?: ICommand[] };

  public constructor(message: string, cause: BreadcAppError['cause']) {
    super(getI18n(message));
    this.cause = cause;
  }
}

export class ResolveCommandError extends BreadcError {
  static INVALID_ARG = 'Resolving invalid argument';

  static INVALID_EMPTY_ARG = 'Resolving invalid empty argument';

  static INVALID_REQUIRED_ARG = 'Resolving invalid required argument';

  static INVALID_OPTIONAL_ARG = 'Resolving invalid optional argument';

  static INVALID_SPREAD_ARG = 'Resolving invalid spread argument';

  static PIECE_BEFORE_REQUIRED =
    'Sub-command should be placed in the beginning';

  static REQUIRED_BEFORE_OPTIONAL =
    'Required argument should be placed before optional arguments';

  static OPTIONAL_BEFORE_SPREAD =
    'Optional argument should be placed before spread arguments';

  static SPREAD_ONLY_ONCE = 'Spread argument can only appear once';

  public cause: { format: string; position: number };

  public constructor(message: string, cause: ResolveCommandError['cause']) {
    super(
      `${message} at the command "${cause.format}", position ${cause.position}`
    );
    this.cause = cause;
  }
}

export class ResolveOptionError extends BreadcError {
  static INVALID_OPTION = 'Resolving invalid option';

  public cause: { format: string };

  public constructor(message: string, cause: ResolveOptionError['cause']) {
    super(`${message} at the option "${cause.format}"`);
    this.cause = cause;
  }
}
