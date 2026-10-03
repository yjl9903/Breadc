import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { breadc, parse, printVersion } from '../src/index.ts';

beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe('version: output', () => {
  it('prints the configured version for both default spellings', async () => {
    const app = breadc('cli', { version: '1.2.3' });
    for (const flag of ['-v', '--version']) {
      vi.mocked(console.log).mockClear();
      const output = await app.run<string>([flag]);
      expect(output).toMatchInlineSnapshot(`"cli/1.2.3"`);
      expect(console.log).toHaveBeenCalledExactlyOnceWith(output);
    }
  });

  it('prints unknown when no version is configured', async () => {
    await expect(breadc('cli').run(['--version'])).resolves.toMatchInlineSnapshot(`"cli/unknown"`);
  });

  it('supports the standalone printVersion helper', () => {
    const output = printVersion(parse(breadc('cli', { version: '2.0', i18n: 'zh' }), []));
    expect(output).toMatchInlineSnapshot(`"cli/2.0"`);
    expect(console.log).toHaveBeenCalledExactlyOnceWith(output);
  });
});

describe('version: configuration', () => {
  it('supports custom short and long spellings', async () => {
    const app = breadc('cli', { version: '2.0', builtin: { version: { spec: '-V, --release' } } });
    for (const flag of ['-V', '--release']) {
      await expect(app.run([flag])).resolves.toMatchInlineSnapshot(`"cli/2.0"`);
    }
  });

  it('supports a long-only spelling', async () => {
    const app = breadc('cli', { version: '2.0', builtin: { version: { spec: '--release' } } });
    await expect(app.run(['--release'])).resolves.toMatchInlineSnapshot(`"cli/2.0"`);
  });
});

describe('version: execution', () => {
  it('takes precedence over help regardless of input order', async () => {
    const app = breadc('cli', { version: '1.2.3' });
    for (const argv of [['--help', '--version'], ['--version', '--help'], ['-hv']]) {
      vi.mocked(console.log).mockClear();
      await expect(app.run(argv)).resolves.toMatchInlineSnapshot(`"cli/1.2.3"`);
      expect(console.log).toHaveBeenCalledExactlyOnceWith('cli/1.2.3');
    }
  });
});
