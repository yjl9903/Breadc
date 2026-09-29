import { assertDeathHandlersReleased } from '../helpers/death.ts';
import { afterEach, describe, expect, it } from 'vitest';

import { TerminalStream } from '../helpers/terminal.ts';

import { chat } from '../../src/chat/chat.ts';

afterEach(assertDeathHandlersReleased);

describe('chat terminal integration', () => {
  it.each(['render', 'log', 'dispose', 'resize', 'widget'] as const)(
    'preserves partial external output without widgets before %s',
    async (operation) => {
      const stream = new TerminalStream();
      const ui = chat({ stream });
      try {
        ui.log('history');
        stream.write('external');
        await stream.flush();
        if (operation === 'resize') stream.resize(8);
        if (operation === 'dispose') ui.dispose();
        else if (operation === 'log') ui.log('-next');
        else if (operation === 'widget') ui.widget({ state: {}, template: 'live' });
        else ui.render();
        await stream.flush();
        expect(stream.content()).toEqual([
          'history',
          operation === 'log' ? 'external-next' : 'external',
          ...(operation === 'widget' ? ['', '', '', '', 'live'] : [])
        ]);
      } finally {
        ui.dispose();
        await stream.dispose();
      }
    }
  );

  it('releases the terminal after the last widget is removed', async () => {
    const stream = new TerminalStream();
    const ui = chat({ stream });
    try {
      ui.log('history');
      const widget = ui.widget({ state: {}, template: ['first', 'second'] });
      await stream.flush();
      widget.remove();
      await Promise.resolve();
      stream.write('external');
      ui.render();
      ui.dispose();
      await stream.flush();
      // The released viewport starts below the original five unused rows.
      expect(stream.content()).toEqual(['history', '', '', '', '', '', '', 'external']);
    } finally {
      ui.dispose();
      await stream.dispose();
    }
  });

  it.each([
    { columns: 5, text: 'abcd你\rX' },
    { columns: 5, text: 'abcd你\rXY' },
    { columns: 5, text: 'abcd你\rX\nend' },
    { columns: 5, text: 'abc\bX' },
    { columns: 5, text: 'abcde\bX' },
    { columns: 5, text: 'abcde\b\bX' },
    { columns: 5, text: '你\bX' },
    { columns: 5, text: '\bX' },
    { columns: 5, text: 'a\tb' },
    { columns: 8, text: 'a\tb' },
    { columns: 8, text: '12345678\tb' },
    { columns: 10, text: '12345678\tb' },
    { columns: 10, text: '123456789\tX' },
    { columns: 10, text: 'abc\rXY' },
    { columns: 10, text: 'abc\r' },
    { columns: 10, text: 'abc\rXY\nnext' },
    { columns: 10, text: 'abcdefghij\rXY' },
    { columns: 10, text: 'abcdefghij\r\tX' },
    { columns: 10, text: 'abc\r\nXY' }
  ])('preserves native control behavior at $columns columns: $text', async ({ columns, text }) => {
    const stream = new TerminalStream(columns);
    const reference = new TerminalStream(columns);
    const ui = chat({ stream });
    try {
      // Exercise the structured layout path used while a live widget exists.
      ui.widget({ state: {}, template: 'live' });
      await Promise.resolve();
      reference.write(`${text}\r\n`);
      ui.log(text);
      await Promise.all([stream.flush(), reference.flush()]);
      expect(stream.content()).toEqual([...reference.content(), 'live']);
    } finally {
      ui.dispose();
      await stream.dispose();
      await reference.dispose();
    }
  });

  it.each(['render', 'log', 'dispose', 'resize'] as const)(
    'preserves external output after clearBottom followed by %s',
    async (operation) => {
      const stream = new TerminalStream();
      const ui = chat({ stream });
      const widgetLines = ['first', 'second', 'third'];
      try {
        ui.log('history');
        ui.widget({ state: {}, template: widgetLines });
        await stream.flush();
        ui.clearBottom();
        stream.write('external output\r\n');
        await stream.flush();
        // Clearing twice must not reclaim the area now owned by the caller.
        ui.clearBottom();
        if (operation === 'resize') stream.resize(8);
        if (operation === 'dispose') ui.dispose();
        else if (operation === 'log') ui.log('next-log');
        else ui.render();
        await stream.flush();
        expect(stream.content()).toEqual([
          'history',
          ...Array(5).fill(''), // Preserve unused original screen rows.
          'external output',
          ...Array(operation === 'dispose' ? 0 : operation === 'resize' ? 4 : 2).fill(''),
          ...(operation === 'log' ? ['next-log'] : []),
          ...(operation === 'dispose' ? [] : widgetLines)
        ]);
      } finally {
        ui.dispose();
        await stream.dispose();
      }
    }
  );

  it.each(['a\tb', '你好\tb', 'a\tb\tc', '\x1B[31ma\x1B[0m\tb', 'a\tb\nc\td'])(
    'preserves native tab alignment in logs: %j',
    async (text) => {
      const stream = new TerminalStream(30);
      const reference = new TerminalStream(30);
      const ui = chat({ stream });
      try {
        reference.write(`${text}\r\n`);
        ui.log(text);
        await Promise.all([stream.flush(), reference.flush()]);
        expect(stream.content()).toEqual(reference.content());
      } finally {
        ui.dispose();
        await stream.dispose();
        await reference.dispose();
      }
    }
  );

  it.each([false, true])('preserves blank log separators with widgets: %s', async (withWidget) => {
    const stream = new TerminalStream();
    const ui = chat({ stream });
    try {
      if (withWidget) ui.spinner('working', { frames: ['-'] });
      await Promise.resolve();
      ui.log('first');
      ui.log();
      ui.log('\x1b[31m\x1b[39m');
      ui.log('second');
      await stream.flush();
      const lines = stream.lines();
      const first = lines.indexOf('first');
      expect(lines.slice(first, first + 4)).toEqual(['first', '', '', 'second']);
      if (withWidget) expect(stream.content().at(-1)).toBe('- working');
    } finally {
      ui.dispose();
      await stream.dispose();
    }
  });

  it.each([false, true])('preserves multiline ANSI styles with fixedBottom: %s', async (fixedBottom) => {
    const stream = new TerminalStream(6);
    const ui = chat({ stream });
    try {
      const widget = ui.widget({ state: {}, template: '\x1b[31mfirst\nsecond\x1b[39m' }, { fixedBottom });
      await stream.flush();
      for (const expected of [
        ['first', 'second'],
        ['third', 'fourth']
      ]) {
        if (expected[0] === 'third') {
          widget.setTemplate('\x1b[31mthird\nfourth\x1b[39m');
          await stream.flush();
        }
        expect(stream.content()).toEqual(expected);
        const buffer = stream.terminal.buffer.active;
        for (let row = 0; row < buffer.length; row += 1) {
          const line = buffer.getLine(row)!;
          if (line.translateToString(true)) expect(line.getCell(0)!.getFgColor()).toBe(1);
        }
      }
    } finally {
      ui.dispose();
      await stream.dispose();
    }
  });

  it.each([false, true])('shows logs after removing a full-height widget (fixedBottom: %s)', async (fixedBottom) => {
    const stream = new TerminalStream(20, 3);
    const ui = chat({ stream, log: { format: (entry) => entry.message } });
    try {
      const widget = ui.widget({ state: {}, template: ['first', 'second', 'third'] }, { fixedBottom });
      await stream.flush();
      widget.remove();
      await Promise.resolve();
      ui.info('after-remove');
      await stream.flush();
      expect(stream.content(true)).toEqual(['after-remove']);

      ui.widget({ state: {}, template: 'new-widget' });
      await stream.flush();
      expect(stream.screen).toEqual(['after-remove', '', 'new-widget']);
    } finally {
      ui.dispose();
      await stream.dispose();
    }
  });
});
