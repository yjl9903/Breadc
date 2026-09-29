import { assertDeathHandlersReleased, death } from '../helpers/death.ts';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { chat, type ChatOptions } from '../../src/chat/chat.ts';
import { MemoryStream } from '../helpers/stream.ts';
import { TerminalStream } from '../helpers/terminal.ts';

const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  try {
    for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
    assertDeathHandlersReleased();
  } finally {
    vi.useRealTimers();
  }
});

function createChat(stream: MemoryStream, options: Omit<ChatOptions, 'stream'> = {}) {
  const ui = chat({ stream, ...options });
  cleanups.push(async () => {
    ui.dispose();
    if (stream instanceof TerminalStream) await stream.dispose();
    else stream.destroy();
  });
  return ui;
}

function setup(columns = 60, rows = 8, options: Omit<ChatOptions, 'stream'> = {}) {
  const stream = new TerminalStream(columns, rows);
  return { stream, ui: createChat(stream, options) };
}

// Keep xterm's asynchronous parser on real timers; control only the application's clock/ticker.
function useTickerClock() {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
}

describe('chat components', () => {
  it('preserves blinking logs and widget style updates', async () => {
    const { stream, ui } = setup();
    const widget = ui.widget({ state: {}, template: 'XY' });
    await stream.flush();
    expect(stream.cell(0, stream.rows - 1).isBlink()).toBeFalsy();

    widget.setTemplate(`\x1B[5mX\x1B[25mY`);
    await stream.flush();
    expect(stream.cell(0, stream.rows - 1).isBlink()).toBeTruthy();
    expect(stream.cell(1, stream.rows - 1).isBlink()).toBeFalsy();

    ui.log(`\x1B[5mX\x1B[25mY`);
    await stream.flush();
    expect(stream.cell(0, stream.rows - 2).isBlink()).toBeTruthy();
    expect(stream.cell(1, stream.rows - 2).isBlink()).toBeFalsy();

    widget.setTemplate('XY');
    await stream.flush();
    expect(stream.cell(0, stream.rows - 1).isBlink()).toBeFalsy();
  });

  it.each([NaN, Infinity, -Infinity])('normalizes non-finite progress values and totals: %s', async (invalid) => {
    const { stream, ui } = setup();
    const progress = ui.progress('build', {
      value: invalid,
      total: 10,
      width: 4,
      template: '[{bar}] {percent}%'
    });
    await stream.flush();
    expect(stream.content()).toEqual(['[░░░░] 0%']);

    progress.setState({ value: 5, total: 10 });
    await stream.flush();
    expect(stream.content()).toEqual(['[██░░] 50%']);

    progress.setState({ value: 5, total: invalid });
    await stream.flush();
    expect(stream.content()).toEqual(['[░░░░] 0%']);

    progress.setState({ value: invalid, total: 10 });
    await stream.flush();
    expect(stream.content()).toEqual(['[░░░░] 0%']);
  });

  it('preserves colon-form log colors while a widget is active', async () => {
    const { stream, ui } = setup();
    ui.spinner('working', { frames: ['-'] });
    await stream.flush();
    ui.log('\x1B[38:2::255:0:0mred\x1B[0m');
    await stream.flush();
    expect(stream.content()).toEqual(['red', '- working']);
    expect(stream.cell(0, stream.rows - 2).getFgColor()).toBe(0xff0000);
  });

  it('emits parameterized log links while a widget is active', async () => {
    const stream = new MemoryStream(true);
    const ui = createChat(stream);
    ui.spinner('working', { frames: ['-'] });
    await Promise.resolve();
    stream.reset();
    ui.log('\x1B]8;id=build;https://example.com\x1B\\link\x1B]8;;\x1B\\');
    expect(stream.output()).toContain('\x1B]8;;https://example.com\x1B\\link\x1B]8;;\x1B\\');
  });

  it.each([
    { footer: ['status'], expected: ['first', 'second', 'status'] },
    { footer: ['status-1', 'status-2'], expected: ['first', 'status-1', 'status-2'] },
    { footer: ['\x1B[31m123456789\x1B[39m'], expected: ['first', '12345678', '9'] },
    { footer: ['a', 'b', 'c', 'd'], expected: ['a', 'b', 'c'] },
    { footer: ['123456789abcdefghijklmnop'], expected: ['12345678', '9abcdefg', 'hijklmno'] },
    { footer: [''], expected: ['first', 'second', ''] },
    { footer: [], expected: ['first', 'second', 'third'] }
  ])('reserves visible rows for fixed-bottom content: $footer', async ({ footer, expected }) => {
    const { stream, ui } = setup(8, 3);
    ui.widget({ state: {}, template: ['first', 'second', 'third'] });
    ui.widget({ state: {}, template: footer }, { fixedBottom: true });
    await stream.flush();
    expect(stream.screen).toEqual(expected);
  });

  it('reclaims ordinary rows when the fixed-bottom widget shrinks or is removed', async () => {
    const { stream, ui } = setup(8, 3);
    ui.widget({ state: {}, template: '123456789abcdefgh' });
    const footer = ui.widget({ state: {}, template: ['status-1', 'status-2'] }, { fixedBottom: true });
    await stream.flush();
    expect(stream.screen).toEqual(['12345678', 'status-1', 'status-2']);

    footer.setTemplate('status');
    await stream.flush();
    expect(stream.screen).toEqual(['12345678', '9abcdefg', 'status']);

    footer.remove();
    await stream.flush();
    expect(stream.screen).toEqual(['12345678', '9abcdefg', 'h']);
  });

  it('preserves logs when widgets are added or wrap onto more rows', async () => {
    const { stream, ui } = setup(20, 6);
    ui.log('saved-log');
    const widget = ui.widget({ state: { text: 'first' }, template: '{text}' });
    await stream.flush();
    ui.widget({ state: {}, template: 'second' });
    await stream.flush();
    expect(stream.aboveViewport(2)).toEqual(['saved-log']);
    expect(stream.screen.slice(-2)).toEqual(['first', 'second']);

    widget.setState({ text: 'x'.repeat(41) });
    await stream.flush();
    expect(stream.aboveViewport(4)).toEqual(['saved-log']);
    expect(stream.screen.slice(-4)).toEqual(['x'.repeat(20), 'x'.repeat(20), 'x', 'second']);
  });

  it('clips long widgets to the visible terminal', async () => {
    const { stream, ui } = setup(20, 6);
    ui.widget({ state: {}, template: 'x'.repeat(10000) });
    await stream.flush();
    expect(stream.screen).toEqual(Array(6).fill('x'.repeat(20)));
    expect(stream.scrollback.every((line) => line === '')).toBe(true);
  });

  it('keeps live widgets after committing logs to scrollback', async () => {
    const { stream, ui } = setup();
    ui.spinner('loading', { frames: ['x'] });
    await stream.flush();
    ui.log('ready');
    await stream.flush();
    expect(stream.content()).toEqual(['ready', 'x loading']);
  });

  it('renders spinner frames on the existing ticker', async () => {
    useTickerClock();
    const { stream, ui } = setup(20, 6, { tickInterval: 20 });
    ui.spinner('spin', { frames: ['a', 'b'] });
    await stream.flush();
    expect(stream.content()).toEqual(['a spin']);

    await vi.advanceTimersByTimeAsync(20);
    await stream.flush();
    expect(stream.content()).toEqual(['b spin']);
  });

  it('automatically updates single- and multi-line progress widgets', async () => {
    const { stream, ui } = setup();
    const single = ui.progress('build', { width: 10, total: 10, value: 3 });
    const multi = ui.progress('bundle', {
      width: 10,
      total: 20,
      value: 5,
      template: ['{message}', '[{bar}] {percent}% {value}/{total}']
    });
    await stream.flush();
    expect(stream.content()).toEqual(['build [███░░░░░░░] 30% 3/10', 'bundle', '[███░░░░░░░] 25% 5/20']);

    single.setState({ value: 7 });
    multi.setState({ value: 10 });
    await stream.flush();
    expect(stream.content()).toEqual(['build [███████░░░] 70% 7/10', 'bundle', '[█████░░░░░] 50% 10/20']);
  });

  it('supports custom fields and replaces the fixed-bottom widget', async () => {
    const { stream, ui } = setup();
    ui.widget({
      state: { message: 'hello', count: 2 },
      template: '{message} x{count} = {double}',
      fields: { double: (ctx) => Number(ctx.state.count) * 2 }
    });
    const first = ui.spinner('old-status', { frames: ['s'], fixedBottom: true });
    await stream.flush();
    expect(stream.content()).toEqual(['hello x2 = 4', 's old-status']);

    ui.progress('new-status', { width: 10, total: 10, value: 3, fixedBottom: true });
    await stream.flush();
    const expected = ['hello x2 = 4', 'new-status [███░░░░░░░] 30% 3/10'];
    expect(stream.content()).toEqual(expected);

    stream.reset();
    first.setState({ message: 'detached' });
    await stream.flush();
    expect(stream.output()).toBe('');
    expect(stream.content()).toEqual(expected);
  });

  it.each(['remove', 'dispose', 'interrupt'] as const)(
    'restores the cursor and releases handlers on %s',
    async (action) => {
      const { stream, ui } = setup();
      const widget = ui.progress('build', { width: 10, total: 10, value: 1 });
      await stream.flush();
      expect(death.callbacks.size).toBe(1);
      stream.reset();

      if (action === 'remove') widget.remove();
      if (action === 'dispose') ui.dispose();
      if (action === 'interrupt') death.emit();
      await stream.flush();
      expect(stream.content()).toEqual([]);
      // xterm's public headless API does not expose cursor visibility.
      expect(stream.output()).toContain('\x1B[?25h');
      expect(death.callbacks.size).toBe(0);

      stream.reset();
      widget.setState({ value: 3 });
      await stream.flush();
      expect(stream.output()).toBe('');
    }
  );

  it('avoids redundant writes for unchanged progress frames', async () => {
    useTickerClock();
    const { stream, ui } = setup(60, 8, { tickInterval: 20 });
    ui.progress('build', { width: 10, total: 10, value: 3 });
    await stream.flush();
    stream.reset();
    await vi.advanceTimersByTimeAsync(200);
    await stream.flush();
    expect(stream.output()).toBe('');
    expect(stream.content()).toEqual(['build [███░░░░░░░] 30% 3/10']);
  });

  it('renders multiple widgets in creation order', async () => {
    const { stream, ui } = setup();
    ui.spinner('s', { frames: ['>'] });
    ui.progress('p1', { width: 10, total: 10, value: 1 });
    ui.progress('p2', { width: 10, total: 10, value: 2 });
    await stream.flush();
    expect(stream.content()).toEqual(['> s', 'p1 [█░░░░░░░░░] 10% 1/10', 'p2 [██░░░░░░░░] 20% 2/10']);
  });

  it('automatically applies template and field replacement through a widget handle', async () => {
    const { stream, ui } = setup();
    const widget = ui.widget({ state: { value: 2 }, template: '{value}' });
    await stream.flush();
    expect(stream.content()).toEqual(['2']);
    widget.setFields({ double: (ctx) => Number(ctx.state.value) * 2 });
    widget.setTemplate('{value}:{double}');
    await stream.flush();
    expect(stream.content()).toEqual(['2:4']);
  });

  it('keeps remove and dispose idempotent', async () => {
    const { stream, ui } = setup();
    const widget = ui.spinner('safe', { frames: ['x'] });
    await stream.flush();
    widget.remove();
    widget.remove();
    ui.dispose();
    await stream.flush();
    stream.reset();
    ui.dispose();
    await stream.flush();
    expect(stream.content()).toEqual([]);
    expect(stream.output()).toBe('');
    expect(death.callbacks.size).toBe(0);
  });

  it('adopts changed terminal dimensions before rendering', async () => {
    const { stream, ui } = setup(12, 8);
    ui.widget({ state: {}, template: '1234567890' });
    await stream.flush();
    stream.resize(4, 5);
    ui.render();
    await stream.flush();
    expect(stream.screen).toEqual(['', '', '12345', '67890']);
  });

  it('truncates widgets taller than the terminal viewport', async () => {
    const { stream, ui } = setup(8, 3);
    ui.widget({ state: {}, template: ['one', 'two', 'three', 'four', 'five'] });
    await stream.flush();
    expect(stream.screen).toEqual(['one', 'two', 'three']);
    stream.reset();
    ui.render();
    await stream.flush();
    expect(stream.output()).toBe('');
  });
});

describe('chat pipe output', () => {
  it('keeps every ordinary and fixed-bottom line in non-tty snapshots', async () => {
    const stream = new MemoryStream(false, 8, 1);
    const ui = createChat(stream);
    ui.widget({ state: {}, template: ['first', 'second'] });
    ui.widget({ state: {}, template: ['status-1', 'status-2'] }, { fixedBottom: true });
    await Promise.resolve();
    expect(stream.output()).toBe('first\nsecond\nstatus-1\nstatus-2\n');
  });

  it('throttles snapshots, resumes at the interval, and allows forced rendering', async () => {
    useTickerClock();
    const stream = new MemoryStream(false);
    const ui = createChat(stream, { tickInterval: 20, nonTTYInterval: 1000 });
    const widget = ui.spinner('spin', { frames: ['a', 'b'] });
    await Promise.resolve();
    expect(stream.output()).toBe('a spin\n');
    stream.reset();
    widget.setState({ message: 'spin-2' });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(999);
    expect(stream.output()).toBe('');
    await vi.advanceTimersByTimeAsync(1);
    expect(stream.output()).toBe('a spin-2\n');
    stream.reset();
    widget.setState({ message: 'forced' });
    await Promise.resolve();
    ui.render(true);
    expect(stream.output()).toBe('a forced\n');
  });

  it('preserves custom ANSI output outside a tty', () => {
    const stream = new MemoryStream(false);
    const ui = createChat(stream, { log: { format: (entry) => `\x1B[31m${entry.message}\x1B[39m` } });
    ui.info('styled');
    expect(stream.output()).toBe('\x1B[31mstyled\x1B[39m\n');
  });
});
