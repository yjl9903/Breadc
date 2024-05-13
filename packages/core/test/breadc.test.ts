import { describe, it, expect } from 'vitest';

import { Breadc } from '../src/index.ts';

describe('breadc', () => {
  it('should create breadc', () => {
    const app = new Breadc('cli', { version: '0.0.0', descriptions: 'app' });
  });
});
