import { describe, expect, it } from 'vitest';

import { options as colorOptions } from '@breadc/color';

colorOptions.enabled = false;

describe('breadc', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2);
  });
});
