import type { StandardSchemaV1 } from '@standard-schema/spec';

import type { Cast } from '../breadc/types/cast.ts';
import type { InternalArgument, InternalOption } from '../breadc/types/internal.ts';

import { DefinitionError, ErrorCode, type InputIssue } from '../error.ts';

type CastTarget = { option: InternalOption } | { argument: InternalArgument };

export type CastResult = { value: unknown; issues?: undefined } | { issues: [InputIssue, ...InputIssue[]] };

function isSchema(cast: Cast<any>): cast is StandardSchemaV1 {
  if (!('~standard' in cast)) return false;
  const protocol = cast['~standard'];
  return protocol?.version === 1 && typeof protocol.validate === 'function';
}

function synchronous<T>(result: T, target: CastTarget): Exclude<T, PromiseLike<unknown>> {
  if (
    result !== null &&
    (typeof result === 'object' || typeof result === 'function') &&
    'then' in result &&
    typeof result.then === 'function'
  ) {
    // Assimilate arbitrary thenables and consume rejections without retrying the converter.
    void Promise.resolve(result).catch(() => {});
    throw new DefinitionError(ErrorCode.ASYNC_CAST_UNSUPPORTED, 'The converter returned an asynchronous result', {
      details: target
    });
  }
  return result as Exclude<T, PromiseLike<unknown>>;
}

function location(target: CastTarget, path: StandardSchemaV1.Issue['path']) {
  let name = 'option' in target ? `--${target.option.long}` : target.argument.name;
  for (const segment of path ?? []) {
    const key = typeof segment === 'object' ? segment.key : segment;
    name +=
      typeof key === 'number' || typeof key === 'symbol'
        ? `[${String(key)}]`
        : /^[A-Za-z_$][\w$]*$/.test(key)
          ? `.${key}`
          : `[${JSON.stringify(key)}]`;
  }
  return name;
}

/** Execute exactly one converter call for the selected input. Schema internals are vendor-owned. */
export function executeCast(
  cast: Cast<any> | undefined,
  raw: unknown,
  target: CastTarget,
  isDefault: boolean
): CastResult {
  if (!cast) return { value: raw };
  if (!isSchema(cast)) return { value: synchronous(cast(raw), target) };

  const value = Array.isArray(raw) ? [...raw] : raw;
  const result = synchronous(cast['~standard'].validate(raw), target);
  if (result.issues === undefined) return { value: result.value };

  const diagnostics = result.issues.length ? result.issues : [{ message: 'Invalid value' }];
  const issues = diagnostics.map((issue): InputIssue => {
    const details = {
      message: `${location(target, issue.path)}: ${issue.message}`,
      path: issue.path,
      value
    };
    return 'option' in target
      ? { ...details, code: ErrorCode.INVALID_OPTION_VALUE, option: target.option }
      : { ...details, code: ErrorCode.INVALID_ARGUMENT_VALUE, argument: target.argument };
  }) as [InputIssue, ...InputIssue[]];

  if (isDefault) {
    throw new DefinitionError(ErrorCode.INVALID_DEFAULT_VALUE, issues.map((issue) => issue.message).join('\n'), {
      details: { ...target, value, issues }
    });
  }

  return { issues };
}
