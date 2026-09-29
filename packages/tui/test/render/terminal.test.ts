import { assertDeathHandlersReleased } from '../helpers/death.ts';
import { afterEach, describe, expect, it } from 'vitest';

import { TerminalStream } from '../helpers/terminal.ts';

import { InlineRenderer } from '../../src/render/renderer.ts';

const cleanups: (() => Promise<void>)[] = [];

function setup(rows = 6, viewportHeight = 2, columns = 20) {
  const stream = new TerminalStream(columns, rows);
  const renderer = new InlineRenderer({ stream, viewportHeight });
  cleanups.push(async () => {
    renderer.dispose();
    await stream.dispose();
  });
  return { stream, renderer };
}

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  assertDeathHandlersReleased();
});

describe('renderer terminal integration', () => {
  it.each(['abcd你\rX', 'abcd你\rXY', 'abcd你\bX', 'abcd你\rX\nend'])(
    'preserves native reflow after overwriting a wrapped wide character: %j',
    async (text) => {
      const { stream, renderer } = setup(6, 1, 5);
      const reference = new TerminalStream(5, 6);
      try {
        reference.write(`${text}\r\n`);
        renderer.commit(text);
        renderer.render((frame) => frame.write('live'));
        await Promise.all([stream.flush(), reference.flush()]);
        expect(stream.aboveViewport(1)).toEqual(reference.content());

        reference.resize(6, 20);
        stream.resize(6, 20);
        renderer.resize();
        renderer.render((frame) => frame.write('live'));
        await Promise.all([stream.flush(), reference.flush()]);
        expect(stream.aboveViewport(1)).toEqual(reference.content());
      } finally {
        await reference.dispose();
      }
    }
  );

  it.each([1, 2, 3])('keeps hidden-cursor live rows out of history when shrinking to %i rows', async (rows) => {
    const ui = setup(6, 4);
    ui.renderer.commit('saved-log');
    ui.renderer.render((frame) => frame.write('live1\nlive2\nlive3\nlive4'));
    await ui.stream.flush();
    // A diff touching the last row must restore the same resize anchor.
    ui.renderer.render((frame) => frame.write('live1\nlive2\nlive3\nchanged'));
    await ui.stream.flush();

    const replacement = Array.from({ length: rows }, (_, index) => `new${index + 1}`);
    for (const height of [rows, 6]) {
      ui.stream.resize(height);
      ui.renderer.resize();
      ui.renderer.render((frame) => frame.write(replacement.join('\n')));
      await ui.stream.flush();
      expect(ui.stream.aboveViewport(rows)).toEqual(['saved-log']);
      expect(ui.stream.screen.slice(-rows)).toEqual(replacement);
    }
  });

  it('keeps the real cursor and preserves history across its documented shrink limitation', async () => {
    const { stream, renderer } = setup(6, 4);
    renderer.commit('saved-log');
    renderer.render((frame) => {
      frame.write('live1\nlive2\nlive3\nlive4');
      frame.setCursor({ x: 3, y: 3 });
    });
    await stream.flush();
    expect(stream.cursor).toEqual({ x: 3, y: 5 });

    // The terminal scrolls these rows away before the renderer can respond.
    stream.resize(2);
    expect(stream.scrollback.slice(-3)).toEqual(['saved-log', 'live1', 'live2']);
    for (const rows of [2, 6]) {
      if (rows !== stream.rows) stream.resize(rows);
      renderer.resize();
      renderer.render((frame) => {
        frame.write('new1\nnew2');
        frame.setCursor({ x: 3, y: 1 });
      });
      await stream.flush();
      expect(stream.aboveViewport(2)).toEqual(['saved-log', 'live1', 'live2']);
      expect(stream.screen.slice(-2)).toEqual(['new1', 'new2']);
      expect(stream.cursor).toEqual({ x: 3, y: rows - 1 });
    }

    renderer.dispose();
    await stream.flush();
    expect(stream.content()).toEqual(['saved-log', 'live1', 'live2']);
  });

  it('restores the resize anchor when hiding an unchanged explicit cursor', async () => {
    const ui = setup(6, 4);
    ui.renderer.commit('saved-log');
    const content = 'live1\nlive2\nlive3\nlive4';
    ui.renderer.render((frame) => {
      frame.write(content);
      frame.setCursor({ x: 2, y: 3 });
    });
    await ui.stream.flush();
    expect(ui.renderer.render((frame) => frame.write(content)).changedCells).toBe(0);
    await ui.stream.flush();

    ui.stream.resize(2);
    ui.renderer.resize();
    ui.renderer.render((frame) => frame.write('new'));
    await ui.stream.flush();
    expect(ui.stream.content()).toEqual(['saved-log', 'new']);
  });

  it.each([undefined, 0, 1])('removes live text after narrowing with cursor row %s', async (cursorRow) => {
    const ui = setup(6, 2, 20);
    ui.renderer.commit('saved-log');
    ui.renderer.render((frame) => {
      frame.write('long-live-first-row\nlong-live-second-row');
      if (cursorRow !== undefined) frame.setCursor({ x: 2, y: cursorRow });
    });
    await ui.stream.flush();

    ui.stream.resize(6, 5);
    ui.renderer.resize();
    ui.renderer.render((frame) => frame.write('new\nlive'));
    await ui.stream.flush();
    expect(ui.stream.content()).toEqual(['saved', '-log', 'new', 'live']);

    ui.stream.resize(6, 20);
    ui.renderer.resize();
    ui.renderer.render((frame) => frame.write('next'));
    await ui.stream.flush();
    expect(ui.stream.content()).toEqual(['saved-log', 'next']);
  });

  it('keeps blank live rows attached after diffs without joining committed lines', async () => {
    const ui = setup(8, 4, 20);
    ui.renderer.commit('history');
    ui.renderer.render((frame) => frame.write('old-first\n\nold-third\nold-last'));
    await ui.stream.flush();
    ui.renderer.render((frame) => frame.write('changed-first\n\nchanged-third\nchanged-last'));
    await ui.stream.flush();

    ui.stream.resize(8, 5);
    ui.renderer.resize();
    ui.renderer.render((frame) => frame.write('new'));
    await ui.stream.flush();
    expect(ui.stream.content()).toEqual(['histo', 'ry', 'new']);

    ui.renderer.commit('committed');
    ui.renderer.render((frame) => frame.write('live'));
    ui.renderer.insertBefore(1, (frame) => frame.write('fixed'));
    ui.renderer.render((frame) => frame.write('done'));
    await ui.stream.flush();
    ui.stream.resize(8, 20);
    ui.renderer.resize();
    ui.renderer.render((frame) => frame.write('done'));
    await ui.stream.flush();
    expect(ui.stream.content()).toEqual(['history', 'committed', 'fixed', 'done']);
  });

  it.each([1, 2, 3])('preserves logs when shrinking a four-row viewport to %i rows', async (rows) => {
    const ui = setup(6, 4);
    const logs = ['log1', 'log2', 'log3'];
    ui.renderer.commit(logs.join('\n'));
    ui.renderer.render((frame) => {
      frame.write('live1\nlive2\nlive3\nlive4');
      frame.setCursor({ x: 0, y: 0 });
    });
    await ui.stream.flush();

    const replacement = Array.from({ length: rows }, (_, index) => `new${index + 1}`);
    for (const height of [rows, 6]) {
      ui.stream.resize(height);
      ui.renderer.resize();
      ui.renderer.render((frame) => frame.write(replacement.join('\n')));
      await ui.stream.flush();
      expect(ui.stream.aboveViewport(rows)).toEqual(logs);
      expect(ui.stream.screen.slice(-rows)).toEqual(replacement);
    }
  });

  it.each(['render', 'commit', 'grow'] as const)('preserves existing output on first %s', async (operation) => {
    const ui = setup(4);
    ui.stream.write('history1\r\nhistory2\r\ncommand\r\n');
    await ui.stream.flush();
    if (operation === 'commit') ui.renderer.commit('log');
    if (operation === 'grow') ui.renderer.setViewportHeight(4);
    ui.renderer.render((frame) => frame.write('widget'));
    await ui.stream.flush();
    expect(ui.stream.content()).toEqual([
      'history1',
      'history2',
      'command',
      '', // The existing cursor row is preserved before reserving the bottom viewport.
      ...(operation === 'commit' ? ['log'] : []),
      'widget'
    ]);
  });

  it('does not clear terminal output when an unused renderer is cleared or disposed', async () => {
    const ui = setup(4);
    ui.stream.write('history1\r\nhistory2\r\ncommand\r\n');
    await ui.stream.flush();
    ui.renderer.clear();
    ui.renderer.resize({ height: 8 });
    ui.renderer.dispose();
    await ui.stream.flush();
    expect(ui.stream.content()).toEqual(['history1', 'history2', 'command']);
  });

  it.each([undefined, 0, 1])('preserves logs across resizes with cursor row %s', async (cursorRow) => {
    const ui = setup();
    const logs = ['log1', 'log2', 'log3', 'log4'];
    ui.renderer.commit(logs.join('\n'));
    const draw = () =>
      ui.renderer.render((frame) => {
        frame.write('widget1\nwidget2');
        if (cursorRow !== undefined) frame.setCursor({ x: 3, y: cursorRow });
      });
    draw();
    await ui.stream.flush();
    for (const rows of [8, 20, 6, 4, 8]) {
      ui.stream.resize(rows);
      ui.renderer.resize();
      draw();
      await ui.stream.flush();
      expect(ui.stream.aboveViewport(2), `history after resize to ${rows} rows`).toEqual(logs);
      expect(ui.stream.screen.slice(-2)).toEqual(['widget1', 'widget2']);
    }
  });

  it('does not wrap or scroll when replacing the continuation of a wide character', async () => {
    const ui = setup(4, 1, 2);
    ui.renderer.render((frame) => {
      frame.buffer.set(0, 0, '你');
      frame.buffer.set(1, 0, '好');
    });
    await ui.stream.flush();
    expect(ui.stream.content()).toEqual([' \uFFFD']);
  });
  it.each([
    { text: 'abcdefghij', height: 1 },
    { text: 'abcdefghij', height: 6 },
    { text: 'abcdefghij\nsecond', height: 2 },
    { text: 'abcd你好世界end', height: 2 },
    { text: 'x'.repeat(64), height: 2 }
  ])('reflows committed text after widening: $text (viewport $height)', async ({ text, height }) => {
    const { stream, renderer } = setup(6, height, 5);
    renderer.render((frame) => frame.write('old'));
    renderer.batch(() => {
      renderer.commit([{ text, style: { foreground: 'red' } }]);
      renderer.render((frame) => frame.write('live'));
    });
    await stream.flush();
    const buffer = stream.terminal.buffer.active;
    expect(Array.from({ length: buffer.length }, (_, row) => buffer.getLine(row)!.isWrapped)).toContain(true);

    stream.resize(6, 80);
    renderer.resize();
    renderer.render((frame) => frame.write('live'));
    await stream.flush();
    expect(stream.content()).toEqual([...text.split('\n'), 'live']);

    renderer.commit('next');
    renderer.render((frame) => frame.write('updated'));
    await stream.flush();
    expect(stream.content()).toEqual([...text.split('\n'), 'next', 'updated']);
  });

  it.each([0, 1, 8])('preserves history on height changes with %i prior lines', async (count) => {
    const { stream, renderer } = setup();
    const history = Array.from({ length: count }, (_, i) => `prior-${i}`);
    if (history.length) stream.write(history.join('\r\n') + '\r\n');
    renderer.commit('saved-log');
    renderer.render((frame) => frame.write('old-first\nold-second'));
    await stream.flush();

    // The latest diff touches only the first row; the cursor must still
    // anchor the full viewport when the terminal changes height.
    renderer.render((frame) => frame.write('new-first\nold-second'));
    await stream.flush();

    for (const rows of [8, 4, 9]) {
      stream.resize(rows);
      renderer.resize();
      renderer.render((frame) => frame.write('new-first\nnew-second'));
      await stream.flush();
      expect(stream.aboveViewport(2)).toEqual([
        ...history,
        // Reserving a viewport preserves all existing screen rows, even unused ones.
        ...Array(count === 0 ? 0 : count < 6 ? 6 - count : 1).fill(''),
        'saved-log'
      ]);
      expect(stream.screen.slice(-2)).toEqual(['new-first', 'new-second']);
    }
  });

  it('preserves logs when resizing with an explicit cursor', async () => {
    const { stream, renderer } = setup();
    renderer.commit('saved-log');
    renderer.render((frame) => {
      frame.write('first\nsecond');
      frame.setCursor({ x: 2, y: 0 });
    });
    await stream.flush();
    stream.resize(8);
    renderer.resize();
    renderer.render((frame) => frame.write('replacement'));
    await stream.flush();
    expect(stream.aboveViewport(2)).toEqual(['saved-log']);
    expect(stream.screen.slice(-2)).toEqual(['replacement', '']);
  });

  it.each([2, 4, 6, 100])('preserves committed logs when the viewport grows to %i rows', async (height) => {
    const { renderer, stream } = setup(6, 1, 20);
    const logs = ['log-1', 'log-2', 'log-3', 'log-4', 'log-5'];
    renderer.commit(logs.join('\n'));
    renderer.render((frame) => frame.write('old-widget'));

    renderer.batch(() => {
      renderer.setViewportHeight(height);
      renderer.render((frame) => frame.write('new-widget'));
    });

    await stream.flush();
    expect(stream.content()).toEqual([...logs, 'new-widget']);
    expect(stream.screen[renderer.area.y]).toBe('new-widget');
  });

  it('preserves logs across shrinking, committing, and growing again', async () => {
    const { renderer, stream } = setup(6, 1, 20);
    renderer.commit('first-log');
    renderer.setViewportHeight(4);
    renderer.render((frame) => frame.write('old-widget'));
    renderer.setViewportHeight(1);
    renderer.commit('second-log');
    renderer.setViewportHeight(6);
    renderer.render((frame) => frame.write('new-widget'));

    await stream.flush();
    expect(stream.content()).toEqual([
      'first-log',
      '',
      '',
      '', // Shrinking releases three rows before the next commit.
      'second-log',
      'new-widget'
    ]);
  });

  it('updates a changed cell without disturbing the rest of the frame', async () => {
    const { stream, renderer } = setup(8, 2, 20);
    renderer.render((frame) => frame.write('build 30%'));
    await stream.flush();
    stream.reset();
    const result = renderer.render((frame) => frame.write('build 40%'));
    await stream.flush();
    expect(result.changedCells).toBe(1);
    expect(stream.screen).toEqual(['', '', '', '', '', '', 'build 40%', '']);
    // Minimal output is a renderer contract, in addition to the final screen result.
    expect(stream.output()).not.toContain('build');
  });

  it.each([
    { before: '你a', after: 'ab', changed: 3 },
    { before: 'abc', after: '你', changed: 3 },
    { before: 'a你b', after: '你ab', changed: 3 }
  ])('replaces wide cells without leaving stale text: $before → $after', async ({ before, after, changed }) => {
    const { stream, renderer } = setup(4, 1, 8);
    renderer.render((frame) => frame.write(before));
    await stream.flush();
    expect(stream.screen).toEqual(['', '', '', before]);
    const result = renderer.render((frame) => frame.write(after));
    await stream.flush();
    expect(result.changedCells).toBe(changed);
    expect(stream.screen).toEqual(['', '', '', after]);
    expect(stream.cell(4, 3).getChars()).toMatch(/^ ?$/);
  });

  it('commits styled history and displays the replacement viewport', async () => {
    const { stream, renderer } = setup(6, 2, 12);
    renderer.render((frame) => frame.write('working'));
    await stream.flush();
    renderer.batch(() => {
      renderer.commit([{ text: 'done', style: { foreground: 'green' } }]);
      renderer.render((frame) => frame.write('next'));
    });
    await stream.flush();
    expect(stream.aboveViewport(2)).toEqual(['done']);
    expect(stream.screen.slice(-3)).toEqual(['done', 'next', '']);
    expect(stream.cell(0, 3).getFgColor()).toBe(2);
    expect(stream.cell(0, 4).isFgDefault()).toBe(true);
  });

  it('renders attributes and colors on cells and resets subsequent plain text', async () => {
    const { stream, renderer } = setup(4, 1, 20);
    renderer.render((frame) =>
      frame.write([
        { text: 'A', style: { foreground: 123, background: '#123456', bold: true, hidden: true } },
        { text: 'B', style: { foreground: '#abc', background: 'brightBlue', underline: true } },
        { text: 'plain' }
      ])
    );
    await stream.flush();
    expect(stream.screen).toEqual(['', '', '', 'ABplain']);
    expect(stream.cell(0, 3).getFgColor()).toBe(123);
    expect(stream.cell(0, 3).getBgColor()).toBe(0x123456);
    expect(stream.cell(0, 3).isBold()).toBeTruthy();
    expect(stream.cell(0, 3).isInvisible()).toBeTruthy();
    expect(stream.cell(1, 3).getFgColor()).toBe(0xaabbcc);
    expect(stream.cell(1, 3).getBgColor()).toBe(12);
    expect(stream.cell(1, 3).isUnderline()).toBeTruthy();
    for (let x = 2; x < 7; x += 1) {
      const cell = stream.cell(x, 3);
      expect(cell.isFgDefault()).toBe(true);
      expect(cell.isBgDefault()).toBe(true);
      expect(cell.isBold()).toBeFalsy();
      expect(cell.isInvisible()).toBeFalsy();
      expect(cell.isUnderline()).toBeFalsy();
    }

    // A style-only diff must repaint existing characters too.
    renderer.render((frame) => frame.write('ABplain'));
    await stream.flush();
    expect(stream.screen).toEqual(['', '', '', 'ABplain']);
    for (let x = 0; x < 2; x += 1) {
      expect(stream.cell(x, 3).isFgDefault()).toBe(true);
      expect(stream.cell(x, 3).isBgDefault()).toBe(true);
      expect(stream.cell(x, 3).isInvisible()).toBeFalsy();
      expect(stream.cell(x, 3).isUnderline()).toBeFalsy();
    }
  });

  it('preserves every line when committing more rows than fit on screen', async () => {
    const { stream, renderer } = setup(4, 1, 8);
    renderer.commit('one\ntwo\nthree\nfour\nfive\nsix');
    await stream.flush();
    expect(stream.content()).toEqual(['one', 'two', 'three', 'four', 'five', 'six']);
    expect(stream.screen).toEqual(['four', 'five', 'six', '']);
  });

  it('redraws after resizing without resetting terminal history', async () => {
    const { stream, renderer } = setup(6, 2, 10);
    renderer.commit('history');
    renderer.render((frame) => frame.write('hello'));
    await stream.flush();
    stream.resize(5, 6);
    expect(renderer.resize()).toBe(true);
    expect(renderer.area).toEqual({ x: 0, y: 3, width: 6, height: 2 });
    expect(renderer.render((frame) => frame.write('hello')).changedCells).toBe(5);
    await stream.flush();
    expect(stream.aboveViewport(2)).toEqual(['histor', 'y']);
    expect(stream.screen.slice(-2)).toEqual(['hello', '']);
  });

  it('retains hit regions and restores the requested cursor after changed frames', async () => {
    const { stream, renderer } = setup(8, 2, 20);
    const draw = (text: string) =>
      renderer.render((frame) => {
        frame.write(text);
        frame.setCursor({ x: 10, y: 0 });
        frame.addRegion('prompt', { x: 0, y: 0, width: 10, height: 1 }, { kind: 'input' });
      });
    draw('first');
    await stream.flush();
    const result = draw('second');
    await stream.flush();
    expect(stream.screen.slice(-2)).toEqual(['second', '']);
    expect(stream.cursor).toEqual({ x: 10, y: 6 });
    expect(result.cursor).toEqual({ x: 10, y: 0 });
    const expected = [{ id: 'prompt', area: { x: 0, y: 0, width: 10, height: 1 }, data: { kind: 'input' } }];
    expect(result.regions).toEqual(expected);
    expect(renderer.regions).toEqual(expected);
  });
});
