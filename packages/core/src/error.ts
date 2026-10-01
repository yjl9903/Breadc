import type { Context } from './runtime/context.ts';
import type { InternalArgument, InternalCommand, InternalOption } from './breadc/types/internal.ts';

/** Stable runtime codes for errors and input diagnostics. */
export const ErrorCode = Object.freeze({
  BREADC_ERROR: 'BREADC_ERROR',

  // CLI declarations
  DUPLICATE_DEFAULT_COMMAND: 'DUPLICATE_DEFAULT_COMMAND',
  DUPLICATE_DEFAULT_GROUP_COMMAND: 'DUPLICATE_DEFAULT_GROUP_COMMAND',
  DUPLICATE_GROUP: 'DUPLICATE_GROUP',
  DUPLICATE_COMMAND: 'DUPLICATE_COMMAND',
  MISSING_COMMAND_ACTION: 'MISSING_COMMAND_ACTION',
  EMPTY_GROUP_SPEC: 'EMPTY_GROUP_SPEC',
  ARGUMENT_IN_GROUP_SPEC: 'ARGUMENT_IN_GROUP_SPEC',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  EMPTY_ARGUMENT: 'EMPTY_ARGUMENT',
  INVALID_REQUIRED_ARGUMENT: 'INVALID_REQUIRED_ARGUMENT',
  INVALID_OPTIONAL_ARGUMENT: 'INVALID_OPTIONAL_ARGUMENT',
  INVALID_SPREAD_ARGUMENT: 'INVALID_SPREAD_ARGUMENT',
  INVALID_ALIAS_FORMAT: 'INVALID_ALIAS_FORMAT',
  COMMAND_AFTER_ARGUMENT: 'COMMAND_AFTER_ARGUMENT',
  REQUIRED_AFTER_OPTIONAL: 'REQUIRED_AFTER_OPTIONAL',
  OPTIONAL_AFTER_SPREAD: 'OPTIONAL_AFTER_SPREAD',
  DUPLICATE_SPREAD_ARGUMENT: 'DUPLICATE_SPREAD_ARGUMENT',
  INVALID_OPTION_SPEC: 'INVALID_OPTION_SPEC',

  // User input
  INVALID_INPUT: 'INVALID_INPUT',
  UNKNOWN_OPTION: 'UNKNOWN_OPTION',
  MISSING_OPTION_VALUE: 'MISSING_OPTION_VALUE',
  DUPLICATE_OPTION: 'DUPLICATE_OPTION',
  INVALID_BOOLEAN_OPTION_VALUE: 'INVALID_BOOLEAN_OPTION_VALUE',
  MISSING_ARGUMENT: 'MISSING_ARGUMENT',
  UNEXPECTED_ARGUMENTS: 'UNEXPECTED_ARGUMENTS',

  // Internal invariants and low-level API misuse
  ARGUMENT_ALREADY_BOUND: 'ARGUMENT_ALREADY_BOUND'
} as const);

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface BreadcErrorOptions extends ErrorOptions {
  details?: Readonly<Record<string, unknown>>;
  context?: Context<any>;
}

export abstract class BreadcError extends Error {
  public readonly code: ErrorCode;

  public readonly details: Readonly<Record<string, unknown>>;

  declare public readonly context?: Context<any>;

  public constructor(message = '', options: BreadcErrorOptions & { code?: ErrorCode } = {}) {
    super(message, options);
    this.name = new.target.name;
    this.code = options.code ?? ErrorCode.BREADC_ERROR;
    this.details = options.details ?? {};
    Object.defineProperty(this, 'context', {
      value: options.context,
      writable: false,
      enumerable: false,
      configurable: true
    });
  }
}

/** Invalid declarations supplied by the CLI author. */
export class DefinitionError extends BreadcError {
  public constructor(code: ErrorCode, message: string, options: BreadcErrorOptions = {}) {
    super(message, { ...options, code });
  }
}

/** Each diagnostic carries only the fields relevant to its code. */
export type InputIssue =
  | { code: typeof ErrorCode.UNKNOWN_OPTION; message: string; name: string; value: string | undefined }
  | { code: typeof ErrorCode.MISSING_OPTION_VALUE; message: string; option: InternalOption; name: string }
  | {
      code: typeof ErrorCode.DUPLICATE_OPTION;
      message: string;
      option: InternalOption;
      name: string;
      value: string | undefined;
    }
  | {
      code: typeof ErrorCode.INVALID_BOOLEAN_OPTION_VALUE;
      message: string;
      option: InternalOption;
      name: string;
      value: string;
    }
  | { code: typeof ErrorCode.MISSING_ARGUMENT; message: string; argument: InternalArgument }
  | { code: typeof ErrorCode.UNEXPECTED_ARGUMENTS; message: string; command: InternalCommand; values: string[] };

/** Invalid argv. Parsing currently throws immediately with one diagnostic. */
export class InputError extends BreadcError {
  public readonly issues: readonly [InputIssue, ...InputIssue[]];

  public constructor(issues: readonly [InputIssue, ...InputIssue[]], options: BreadcErrorOptions = {}) {
    super(issues.map((issue) => issue.message).join('\n'), { ...options, code: ErrorCode.INVALID_INPUT });
    this.issues = [...issues];
  }
}

/** Broken framework invariants or misuse of low-level APIs. */
export class InternalError extends BreadcError {
  public constructor(code: ErrorCode, message: string, options: BreadcErrorOptions = {}) {
    super(message, { ...options, code });
  }
}
