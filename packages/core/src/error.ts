import type { Context } from './runtime/context.ts';
import type { InternalArgument, InternalCommand, InternalGroup, InternalOption } from './breadc/types/internal.ts';

export abstract class BreadcError extends Error {}

type RuntimeErrorCause = {
  group?: InternalGroup;
  command?: InternalCommand;
  argument?: InternalArgument;
} & {
  option?: InternalOption;
  name?: string;
  value?: unknown;
};

type RuntimeErrorInput = RuntimeErrorCause & {
  context?: Context<any>;
};

export class RuntimeError extends BreadcError {
  static REQUIRED_ARGUMENT_MISSING = 'Missing required argument';

  static OPTIONAL_ARGUMENT_ACCEPT_ONCE = 'Optional argument can only be assigned once';

  static REQUIRED_ARGUMENT_ACCEPT_ONCE = 'Required argument can only be assigned once';

  static BOOLEAN_OPTION_ACCEPT_ONCE = 'Boolean option can only be assigned once';

  static OPTIONAL_OPTION_ACCEPT_ONCE = 'Optional option can only be assigned once';

  static REQUIRED_OPTION_ACCEPT_ONCE = 'Required option can only be assigned once';

  public cause: RuntimeErrorCause;

  public context?: Context<any>;

  public constructor(message: string, input: RuntimeErrorInput = {}) {
    const { context, ...cause } = input;
    super(message);
    Object.defineProperty(this, 'context', {
      value: context,
      writable: false,
      enumerable: false,
      configurable: true
    });
    this.cause = cause;
  }
}

type BreadcAppErrorCause = {
  command?: InternalCommand;
  commands?: (InternalCommand | InternalGroup)[];
};

type BreadcAppErrorInput = BreadcAppErrorCause & {
  context?: Context<any>;
};

export class BreadcAppError extends BreadcError {
  static DUPLICATED_DEFAULT_COMMAND = `Find duplicated default commands`;

  static DUPLICATED_GROUP = `Find duplicated groups`;

  static DUPLICATED_COMMAND = `Find duplicated commands`;

  static NO_ACTION_BOUND = `There is no action function bound in this command`;

  public cause: BreadcAppErrorCause;

  public context?: Context<any>;

  public constructor(message: string, input: BreadcAppErrorInput) {
    const { context, ...cause } = input;
    super(message);
    Object.defineProperty(this, 'context', {
      value: context,
      writable: false,
      enumerable: false,
      configurable: true
    });
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
