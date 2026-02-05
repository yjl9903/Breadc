import type { InternalCommand, InternalGroup } from './breadc/types/internal.ts';

export abstract class BreadcError extends Error {}

export class RuntimeError extends BreadcError {}

export class BreadcAppError extends BreadcError {
  static DUPLICATED_DEFAULT_COMMAND = `Find duplicated default commands`;

  static DUPLICATED_COMMAND = `Find duplicated commands`;

  static NO_ACTION_BOUND = `There is no action function bound in this command`;

  public cause: {
    command?: InternalCommand;
    commands?: (InternalCommand | InternalGroup)[];
  };

  public constructor(message: string, cause: BreadcAppError['cause']) {
    super(message);
    this.cause = cause;
  }
}

export class ResolveGroupError extends BreadcError {
  static EMPTY = 'Group spec should not be empty';

  static INVALID_ARG_IN_GROUP = 'Resolving argument in group spec';

  public cause: { spec: string; position: number };

  public constructor(message: string, cause: ResolveGroupError['cause']) {
    super(`${message} at the command "${cause.spec}", position ${cause.position}`);
    this.cause = cause;
  }
}

export class ResolveCommandError extends BreadcError {
  static INVALID_ARG = 'Resolving invalid argument';

  static INVALID_EMPTY_ARG = 'Resolving invalid empty argument';

  static INVALID_REQUIRED_ARG = 'Resolving invalid required argument';

  static INVALID_OPTIONAL_ARG = 'Resolving invalid optional argument';

  static INVALID_SPREAD_ARG = 'Resolving invalid spread argument';

  static INVALID_ALIAS_FORMAT = 'Alias command format should not have arguments';

  static PIECE_BEFORE_REQUIRED = 'Sub-command should be placed in the beginning';

  static REQUIRED_BEFORE_OPTIONAL = 'Required argument should be placed before optional arguments';

  static OPTIONAL_BEFORE_SPREAD = 'Optional argument should be placed before spread arguments';

  static SPREAD_ONLY_ONCE = 'Spread argument can only appear once';

  public cause: { spec: string; position: number };

  public constructor(message: string, cause: ResolveCommandError['cause']) {
    super(`${message} at the command "${cause.spec}", position ${cause.position}`);
    this.cause = cause;
  }
}

export class ResolveOptionError extends BreadcError {
  static INVALID_OPTION = 'Resolving invalid option';

  public cause: { spec: string };

  public constructor(message: string, cause: ResolveOptionError['cause']) {
    super(`${message} at the option "${cause.spec}"`);
    this.cause = cause;
  }
}
