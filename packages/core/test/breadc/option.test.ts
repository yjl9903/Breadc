import { describe, it, expect } from 'vitest';

import { Option } from '../../src/breadc/option.ts';

describe('option', () => {
  it('should resolve short option', () => {
    const opt = new Option('-s');
    opt.resolve();
  });

  it('should resolve long option', () => {
    const opt = new Option('-s');
    opt.resolve();
  });

  it('should resolve short and long option', () => {
    const opt = new Option('-s');
    opt.resolve();
  });
});
