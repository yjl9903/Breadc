import { stripVTControlCharacters } from 'node:util';
import stringWidth from 'fast-string-width';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { breadc, parse, printHelp, printVersion, type BreadcOutput } from '../src/index.ts';

beforeEach(() => {
  vi.spyOn(process, 'stdout', 'get').mockReturnValue({
    columns: 120,
    write: vi.fn(() => true)
  } as unknown as typeof process.stdout);
});
afterEach(() => vi.restoreAllMocks());

function capture(columns?: number) {
  return {
    columns,
    text: '',
    write(text: string) {
      this.text += text;
    }
  };
}

const description = 'Read the application documentation before choosing a command. '.repeat(3).trim();

describe('output: console fallback', () => {
  it.each([
    { name: 'no process', runtime: undefined },
    { name: 'no stdout', runtime: {} },
    { name: 'no stdout writer', runtime: { stdout: { columns: 120 } } }
  ])('prints help and version with $name', async ({ runtime }) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const app = breadc('cli', { description });
    const expectedHelp = printHelp(parse(app, []), { output: capture(80) });
    const results: Promise<string>[] = [];

    vi.stubGlobal('process', runtime);
    try {
      results.push(app.run<string>([]), app.run<string>(['--help']), app.run<string>(['--version']));
      printHelp(parse(app, []));
      printVersion(parse(app, []));
    } finally {
      // Restore the test runner's environment before yielding to its event loop.
      vi.unstubAllGlobals();
    }

    expect(await Promise.all(results)).toEqual([expectedHelp, expectedHelp, 'cli/unknown']);
    expect(log.mock.calls).toEqual([[expectedHelp], [expectedHelp], ['cli/unknown'], [expectedHelp], ['cli/unknown']]);
  });

  it('keeps explicit output working without process', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const output = capture(40);
    const context = parse(breadc('cli', { description }), []);
    const expectedHelp = printHelp(context, { output: capture(40) });

    vi.stubGlobal('process', undefined);
    try {
      printHelp(context, { output });
      printVersion(context, { output });
    } finally {
      vi.unstubAllGlobals();
    }

    expect(output.text).toBe(`${expectedHelp}\ncli/unknown\n`);
    expect(log).not.toHaveBeenCalled();
  });

  it('propagates stdout write failures without redirecting to console', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = new Error('stdout unavailable');
    vi.mocked(process.stdout.write).mockImplementation(() => {
      throw error;
    });
    expect(() => printVersion(parse(breadc('cli'), []))).toThrow(error);
    expect(log).not.toHaveBeenCalled();
  });
});

describe('output: destinations', () => {
  it.each([['--help'], ['--version'], [], ['missing'], ['tools'], ['tools', '--help']])(
    'routes %j through the configured output',
    async (...argv) => {
      const output = capture(40);
      const app = breadc('cli', { output });
      app.group('tools').command('run');
      const text = await app.run<string>(argv);
      expect(output.text).toBe(`${text}\n`);
      expect(output.text).toContain('cli/unknown');
      expect(process.stdout.write).not.toHaveBeenCalled();
    }
  );

  it('keeps outputs isolated between applications', async () => {
    const first = capture();
    const second = capture();
    await breadc('first', { output: first }).run(['--version']);
    await breadc('second', { output: second }).run(['--version']);
    expect(first.text).toBe('first/unknown\n');
    expect(second.text).toBe('second/unknown\n');
  });

  it('uses explicitly supplied destinations in standalone helpers', () => {
    const applicationOutput = capture();
    const output = capture(40);
    const context = parse(breadc('cli', { output: applicationOutput, description }), []);
    const help = printHelp(context, { output, i18n: 'zh' });
    const version = printVersion(context, { output });
    expect(output.text).toBe(`${help}\n${version}\n`);
    expect(stripVTControlCharacters(help)).toContain('用法:');
    expect(applicationOutput.text).toBe('');
    expect(process.stdout.write).not.toHaveBeenCalled();

    printVersion(context);
    expect(process.stdout.write).toHaveBeenCalledWith('cli/unknown\n');
    const defaultHelp = printHelp(context);
    expect(process.stdout.write).toHaveBeenCalledWith(`${defaultHelp}\n`);
    expect(applicationOutput.text).toBe('');
  });

  it.each([[], ['--help'], ['--version']])('propagates output errors for %j', async (...argv) => {
    const error = new Error('Output unavailable');
    const output: BreadcOutput = {
      write() {
        throw error;
      }
    };
    await expect(breadc('cli', { output }).run(argv)).rejects.toBe(error);
  });
});

describe('output: help width', () => {
  it('reads a changing width and preserves long example commands', async () => {
    let columns = 32;
    const command = `cli send ${'file-'.repeat(30)}`;
    const output = {
      ...capture(),
      get columns() {
        return columns;
      }
    };
    const app = breadc('cli', {
      output,
      description: { description, examples: [{ command }] }
    });
    app.command('send <file>', '发送文件到目标目录，并显示文件的上传结果。');
    const narrow = stripVTControlCharacters(await app.run<string>(['--help']));
    expect(narrow).toContain(`  ${command}\n`);
    expect(
      narrow
        .split('\n')
        .filter((line) => line !== `  ${command}`)
        .every((line) => stringWidth(line) <= 32)
    ).toBe(true);
    columns = 96;
    const wide = stripVTControlCharacters(await app.run<string>(['--help']));
    expect(wide).not.toBe(narrow);
    expect(wide).toContain(description.slice(0, description.indexOf('command.') + 8));
    expect(wide).toContain(`  ${command}\n`);
  });

  it('uses the current stdout width by default', async () => {
    const app = breadc('cli', { description });
    const wide = await app.run<string>(['--help']);
    process.stdout.columns = 40;
    const narrow = await app.run<string>(['--help']);
    expect(narrow).not.toBe(wide);
    expect(narrow).toBe(await breadc('cli', { description, output: capture(40) }).run(['--help']));
  });

  it.each([undefined, 0, -1, 0.5, NaN, Infinity])('falls back to 80 for width %s', async (columns) => {
    const fallback = await breadc('cli', { description, output: capture(columns) }).run(['--help']);
    const fixed = await breadc('cli', { description, output: capture(80) }).run(['--help']);
    expect(fallback).toBe(fixed);
  });

  it('rounds valid fractional widths down', async () => {
    const rounded = await breadc('cli', { description, output: capture(40.8) }).run(['--help']);
    const fixed = await breadc('cli', { description, output: capture(40) }).run(['--help']);
    expect(rounded).toBe(fixed);
  });
});
