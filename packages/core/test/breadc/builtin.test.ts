import { describe, it, expect } from 'vitest';

import { Breadc } from '../../src/index.ts';

describe.skip('breadc builtin version comamnd', () => {
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

  it('should be overwritten by single format', () => {
    const app = new Breadc('cli', {
      version: '2.0.0',
      builtin: {
        version: {
          format: '-V'
        }
      }
    });
    expect(app.run(['-V'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
    expect(() => app.run(['-v'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
    expect(() => app.run(['--version'])).toThrowErrorMatchingInlineSnapshot(
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
    expect(() => app.run(['-v'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
    expect(app.run(['-V'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
    expect(app.run(['--version'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
  });
});

describe.skip('breadc builtin help comamnd', () => {
  it('should print default help', () => {
    const app = new Breadc('cli');
    expect(app.run(['-h'])).toMatchInlineSnapshot(`"cli/unknown"`);
    expect(app.run(['--help'])).toMatchInlineSnapshot(`"cli/unknown"`);
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
    expect(app.run(['help'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
    expect(() => app.run(['-h'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
    expect(() => app.run(['--help'])).toThrowErrorMatchingInlineSnapshot(
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
    expect(() => app.run(['-h'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
    expect(app.run(['help'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
    expect(app.run(['--help'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
  });
});
