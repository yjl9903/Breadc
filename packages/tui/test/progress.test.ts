import { describe, expect, it } from 'vitest';

import { progress } from '../src';

describe('Progress', () => {
  it('should print progress', () => {
    for (const i of progress([1, 2, 3])) {
      console.log(i);
    }
  });
});
