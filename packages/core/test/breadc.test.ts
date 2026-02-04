import { afterEach, describe, it, expect, vi } from 'vitest';

import { breadc } from '../src/breadc/index.ts';
import { printHelp } from '../src/breadc/builtin/help.ts';
import { printVersion } from '../src/breadc/builtin/version.ts';
import { context as makeContext } from '../src/runtime/context.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('builtin version command', () => {
  it('should print unknown version', () => {
    const app = breadc('cli');
    const ctx = makeContext(app as any, []);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(printVersion(ctx)).toBe('cli/unknown');
    expect(log).toHaveBeenCalledWith('cli/unknown');
  });

  it('should print passed version', () => {
    const app = breadc('cli', { version: '1.0.0' });
    const ctx = makeContext(app as any, []);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(printVersion(ctx)).toBe('cli/1.0.0');
    expect(log).toHaveBeenCalledWith('cli/1.0.0');
  });
});

describe('builtin help command', () => {
  it('should print default help', () => {
    const app = breadc('cli');
    const ctx = makeContext(app as any, []);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(printHelp(ctx)).toBe('cli/unknown');
    expect(log).toHaveBeenCalledWith('cli/unknown');
  });

  it('should print help when no commands matched', async () => {
    const app = breadc('cli');
    app.command('ping').action(() => 'pong');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(app.run(['unknown'])).resolves.toBe('cli/unknown');
    expect(log).toHaveBeenCalledWith('cli/unknown');
  });

  it.todo('should generate rich help message output');
  it.todo('should support custom builtin spec/description');
});

describe('builtin i18n', () => {
  it.todo('should print chinese help');
});
