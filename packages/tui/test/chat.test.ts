import { Writable } from 'node:stream';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { chat } from '../src/chat/index.ts';

class MemoryStream extends Writable {
  public readonly chunks: string[] = [];

  public readonly isTTY: boolean;

  public columns = 120;

  constructor(isTTY: boolean) {
    super();
    this.isTTY = isTTY;
  }

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
    callback();
  }

  output() {
    return this.chunks.join('');
  }

  reset() {
    this.chunks.length = 0;
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe('chat ui', () => {
  it('keeps bottom widgets after writing logs', async () => {
    vi.useFakeTimers();
    const stream = new MemoryStream(true);
    const ui = chat({ stream, tickInterval: 20 });

    ui.spinner('loading', { frames: ['x'] });
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();

    stream.reset();
    ui.info('ready');
    await Promise.resolve();

    const output = stream.output();
    expect(output).toContain('ready');
    expect(output).toContain('loading');

    ui.dispose();
  });

  it('renders spinner frame by tick', async () => {
    vi.useFakeTimers();
    const stream = new MemoryStream(true);
    const ui = chat({ stream, tickInterval: 20 });

    ui.spinner('spin', { frames: ['a', 'b'] });
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();
    expect(stream.output()).toContain('a spin');

    stream.reset();
    await vi.advanceTimersByTimeAsync(25);
    await Promise.resolve();
    expect(stream.output()).toContain('b spin');

    ui.dispose();
  });

  it('renders progress in single and multiple lines', async () => {
    vi.useFakeTimers();
    const stream = new MemoryStream(true);
    const ui = chat({ stream, tickInterval: 20 });

    const single = ui.progress('build', { total: 10, value: 3 });
    const multi = ui.progress('bundle', {
      total: 20,
      value: 5,
      template: ['{message}', '[{bar}] {percent}% {value}/{total}']
    });

    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();

    let output = stream.output();
    expect(output).toContain('build');
    expect(output).toContain('30% 3/10');
    expect(output).toContain('bundle');
    expect(output).toContain('25% 5/20');

    stream.reset();
    single.setState({ value: 7 });
    multi.setState({ value: 10 });
    await Promise.resolve();

    output = stream.output();
    expect(output).toContain('70% 7/10');
    expect(output).toContain('50% 10/20');

    ui.dispose();
  });

  it('hides cursor while rendering and restores it on cleanup', async () => {
    vi.useFakeTimers();
    const stream = new MemoryStream(true);
    const ui = chat({ stream, tickInterval: 20 });

    const widget = ui.progress('build', { total: 10, value: 1 });
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();

    expect(stream.output()).toContain('\x1B[?25l');
    expect(stream.output()).not.toContain('\x1B[?25h');

    stream.reset();
    widget.remove();
    await Promise.resolve();
    expect(stream.output()).toContain('\x1B[?25h');

    stream.reset();
    ui.progress('build-2', { total: 10, value: 2 });
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();
    expect(stream.output()).toContain('\x1B[?25l');

    stream.reset();
    ui.dispose();
    expect(stream.output()).toContain('\x1B[?25h');
  });

  it('supports custom fields for templates', async () => {
    vi.useFakeTimers();
    const stream = new MemoryStream(true);
    const ui = chat({ stream, tickInterval: 20 });

    ui.widget({
      state: { message: 'hello', count: 2 },
      template: '{message} x{count} = {double}',
      fields: {
        double: (ctx) => Number(ctx.state.count) * 2
      }
    });

    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();

    expect(stream.output()).toContain('hello x2 = 4');

    ui.dispose();
  });

  it('renders multiple widgets in creation order', async () => {
    vi.useFakeTimers();
    const stream = new MemoryStream(true);
    const ui = chat({ stream, tickInterval: 20 });

    ui.spinner('s', { frames: ['>'] });
    ui.progress('p1', { total: 10, value: 1 });
    ui.progress('p2', { total: 10, value: 2 });

    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();
    const output = stream.output();

    const sIndex = output.indexOf('> s');
    const p1Index = output.indexOf('p1');
    const p2Index = output.indexOf('p2');

    expect(sIndex).toBeGreaterThanOrEqual(0);
    expect(p1Index).toBeGreaterThan(sIndex);
    expect(p2Index).toBeGreaterThan(p1Index);

    ui.dispose();
  });

  it('throttles non-tty rendering and allows forced render', async () => {
    vi.useFakeTimers();
    const stream = new MemoryStream(false);
    const ui = chat({ stream, tickInterval: 20, nonTTYInterval: 1000 });

    const widget = ui.spinner('spin', { frames: ['a', 'b'] });
    await Promise.resolve();
    expect(stream.output()).toContain('a spin');

    stream.reset();
    await vi.advanceTimersByTimeAsync(200);
    await Promise.resolve();
    expect(stream.output()).toBe('');

    widget.setState({ message: 'spin-2' });
    await Promise.resolve();
    expect(stream.output()).toBe('');

    ui.render(true);
    expect(stream.output()).toContain('spin-2');

    ui.dispose();
  });

  it('supports idempotent remove and dispose', async () => {
    vi.useFakeTimers();
    const stream = new MemoryStream(true);
    const ui = chat({ stream, tickInterval: 20 });

    const widget = ui.spinner('safe', { frames: ['x'] });
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();

    expect(() => {
      widget.remove();
      widget.remove();
      ui.dispose();
      ui.dispose();
    }).not.toThrow();
  });
});
