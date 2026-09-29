import { assertDeathHandlersReleased } from '../helpers/death.ts';

import { afterEach, describe, expect, it } from 'vitest';

import { InlineRenderer } from '../../src/render/renderer.ts';
import { MemoryStream } from '../helpers/stream.ts';
import { TerminalStream } from '../helpers/terminal.ts';

afterEach(assertDeathHandlersReleased);

describe('fixed-row scrollback insertion', () => {
  it('preserves blank rows in pipe output without terminal controls', () => {
    const stream = new MemoryStream(false, 5, 4);
    const renderer = new InlineRenderer({ stream });
    try {
      renderer.insertBefore(3, (frame) => {
        frame.write({ text: 'first', style: { bold: true } });
        frame.write('last', { y: 2 });
      });
      expect(stream.output()).toBe('first\n\nlast\n');
    } finally {
      renderer.dispose();
    }
  });

  it.each([
    [1, 1],
    [1, 4],
    [3, 1],
    [3, 4],
    [9, 1],
    [9, 4]
  ])('preserves %i inserted rows with a %i-row viewport', async (height, viewportHeight) => {
    const stream = new TerminalStream(5, 4);
    const renderer = new InlineRenderer({ stream, viewportHeight });
    const lines = Array.from({ length: height }, (_, i) => ['12345', '', '你ab'][i % 3]);
    try {
      renderer.commit('saved');
      renderer.render((frame) => frame.write('old'));
      renderer.batch(() => {
        renderer.insertBefore(height, (frame) => {
          for (const [y, text] of lines.entries()) {
            frame.write({ text, style: { foreground: 'red' } }, { y, height: 1 });
          }
        });
        renderer.render((frame) => frame.write('live'));
      });
      await stream.flush();

      expect(stream.aboveViewport(viewportHeight)).toEqual(['saved', ...lines]);
      expect(stream.screen.slice(-viewportHeight)).toEqual(['live', ...Array(viewportHeight - 1).fill('')]);
      const buffer = stream.terminal.buffer.active;
      const firstInsertedRow = stream.lines().indexOf('12345');
      expect(buffer.getLine(firstInsertedRow)!.getCell(0)!.getFgColor()).toBe(1);

      // Fixed rows must remain separate logical lines when the terminal widens.
      stream.resize(4, 10);
      renderer.resize();
      renderer.render((frame) => frame.write('next'));
      await stream.flush();
      expect(stream.aboveViewport(viewportHeight)).toEqual(['saved', ...lines]);
      expect(stream.screen.slice(-viewportHeight)).toEqual(['next', ...Array(viewportHeight - 1).fill('')]);
    } finally {
      renderer.dispose();
      await stream.dispose();
    }
  });
});
