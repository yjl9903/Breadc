import { describe, it, expect } from 'vitest';

import { Breadc } from '../../src/index.ts';

describe('breadc builtin version comamnd', () => {
  it('should print unknown version', () => {
    const app = new Breadc('cli');
    expect(app.runSync(['-v'])).toMatchInlineSnapshot(`"cli/unknown"`);
    expect(app.runSync(['--version'])).toMatchInlineSnapshot(`"cli/unknown"`);
  });

  it('should print passed version', () => {
    const app = new Breadc('cli', { version: '1.0.0' });
    expect(app.runSync(['-v'])).toMatchInlineSnapshot(`"cli/1.0.0"`);
    expect(app.runSync(['--version'])).toMatchInlineSnapshot(`"cli/1.0.0"`);
  });

  it('should be overwritten by single format', () => {
    const app = new Breadc('cli', {
      version: '2.0.0',
      builtin: {
        version: {
          format: '-V'
        }
      }
    });
    expect(app.runSync(['-V'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
    expect(() => app.runSync(['-v'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
    expect(() => app.runSync(['--version'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
  });

  it('should be overwritten by format array', () => {
    const app = new Breadc('cli', {
      version: '2.0.0',
      builtin: {
        version: {
          format: ['-V', '--version']
        }
      }
    });
    expect(() => app.runSync(['-v'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
    expect(app.runSync(['-V'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
    expect(app.runSync(['--version'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
  });
});

describe('breadc builtin help comamnd', () => {
  it('should print default help', () => {
    const app = new Breadc('cli');
    expect(app.runSync(['-h'])).toMatchInlineSnapshot(`"cli/unknown"`);
    expect(app.runSync(['--help'])).toMatchInlineSnapshot(`"cli/unknown"`);
  });

  it('should be overwritten by single format', () => {
    const app = new Breadc('cli', {
      version: '2.0.0',
      builtin: {
        help: {
          format: 'help'
        }
      }
    });
    expect(app.runSync(['help'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
    expect(() => app.runSync(['-h'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
    expect(() => app.runSync(['--help'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
  });

  it('should be overwritten by format array', () => {
    const app = new Breadc('cli', {
      version: '2.0.0',
      builtin: {
        help: {
          format: ['help', '--help']
        }
      }
    });
    expect(() => app.runSync(['-h'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
    expect(app.runSync(['help'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
    expect(app.runSync(['--help'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
  });
});
