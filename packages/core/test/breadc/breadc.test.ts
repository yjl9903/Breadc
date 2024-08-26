import { describe, it, expect } from 'vitest';

import { Breadc } from '../../src/index.ts';

describe('breadc', () => {
  it('should create breadc', () => {
    const app = new Breadc('cli', { version: '0.0.0', description: 'app' });
  });

  it('should not parse duplicated default command', () => {
    const app = new Breadc('cli');
    expect(() => {
      app.command('');
      app.command('');
    }).toThrowErrorMatchingInlineSnapshot(`[Error: Find duplicated default command]`);
  });
});
