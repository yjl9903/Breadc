import { describe, expect, it } from 'vitest';

import { options as colorOptions } from '@breadc/color';
import * as core from '@breadc/core';
import * as wrapper from '../src/index.ts';

colorOptions.enabled = false;

describe('breadc', () => {
  it('re-exports error constructors and runtime codes', () => {
    for (const name of ['BreadcError', 'DefinitionError', 'InputError', 'InternalError', 'ErrorCode'] as const) {
      expect(wrapper[name]).toBe(core[name]);
    }
    const issue: wrapper.InputIssue = {
      code: wrapper.ErrorCode.UNKNOWN_OPTION,
      message: 'Unknown option',
      name: '--typo',
      value: undefined
    };
    const error = new wrapper.InputError([issue]);
    expect(error).toBeInstanceOf(core.BreadcError);
    expect(error.code).toBe(wrapper.ErrorCode.INVALID_INPUT);
    expect(Object.isFrozen(wrapper.ErrorCode)).toBe(true);
  });
});
