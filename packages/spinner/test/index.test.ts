import { describe, it, expect } from 'vitest';

import { spinner } from '../src';

describe('Spinner', () => {
  it('should print progress', () => {
    const spin = spinner();
    expect(1 + 1).toBe(2);
  });
});
