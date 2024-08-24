import { describe, it, expect } from 'vitest';

import { Breadc } from '../../src/index.ts';

describe('breadc builtin version comamnds', () => {
  it('should print unknown version', () => {
    const app = new Breadc('cli');
    expect(app.run(['-v'])).toMatchInlineSnapshot(`"cli/unknown"`);
    expect(app.run(['--version'])).toMatchInlineSnapshot(`"cli/unknown"`);
  });

  it('should print passed version', () => {
    const app = new Breadc('cli', { version: '1.0.0' });
    expect(app.run(['-v'])).toMatchInlineSnapshot(`"cli/1.0.0"`);
    expect(app.run(['--version'])).toMatchInlineSnapshot(`"cli/1.0.0"`);
  });
});
