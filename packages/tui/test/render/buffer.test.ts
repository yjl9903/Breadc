import { describe, expect, it } from 'vitest';

import { CellBuffer, layoutTextBuffer, measureText } from '../../src/render/buffer.ts';

import type { Text } from '../../src/render/types.ts';

describe('cell buffer', () => {
  it('reports text in later spans as truncated after the last available newline', () => {
    const buffer = new CellBuffer(5, 1);
    const text = [{ text: 'a\n' }, { text: '' }, { text: 'b' }];

    expect(buffer.write(text)).toEqual(buffer.write('a\nb'));
    expect(buffer.write(text).truncated).toBe(true);
    expect(buffer.write([{ text: 'a\n' }, { text: '' }]).truncated).toBe(false);
  });

  it.each(['❤️X', '👨‍👩‍👧‍👦X', '🇨🇳X', 'e\u0301X', 'a\r\nb'])('lays out graphemes across span boundaries: %s', (text) => {
    // Splitting at every UTF-16 code unit also exercises surrogate pairs.
    const spans = text.split('').map((text, index) => ({
      text,
      style: { foreground: index === 0 ? ('red' as const) : ('blue' as const) }
    }));
    for (const width of [1, 2, 3, 5]) {
      const buffer = new CellBuffer(width, 8);
      const plain = new CellBuffer(width, 8);
      const result = buffer.write(spans);
      expect(result).toEqual(plain.write(text));
      expect(measureText(spans, width)).toEqual(measureText(text, width));
      for (let row = 0; row < buffer.height; row += 1) {
        expect(symbols(buffer, row)).toBe(symbols(plain, row));
      }
      expect(buffer.get(0, 0).style.foreground).toBe('red');
    }
  });

  it.each([true, false])('replaces wide text inside a single column (wrap: %s)', (wrap) => {
    const buffer = new CellBuffer(3, 1);
    buffer.write('abc');
    const options = { x: 1, width: 1, wrap };
    const result = buffer.write('你', options);

    expect(symbols(buffer, 0)).toBe('a\uFFFDc');
    expect(result).toEqual({ rows: 1, cursor: { x: 2, y: 0 }, truncated: false });
    expect(measureText('你', 3, options)).toEqual(result);
  });

  it('wraps replacement characters without adding an initial blank row', () => {
    const buffer = new CellBuffer(1, 2);
    const result = buffer.write('你好');

    expect([symbols(buffer, 0), symbols(buffer, 1)]).toEqual(['\uFFFD', '\uFFFD']);
    expect(result).toEqual({ rows: 2, cursor: { x: 1, y: 1 }, truncated: false });
    expect(measureText('你好', 1)).toEqual(result);
  });

  it('fills with complete wide characters and clips at the fill boundary', () => {
    const buffer = new CellBuffer(8, 2);
    buffer.fill(buffer.area, '.');
    const style = { foreground: 'red' as const };
    buffer.fill({ x: 1, y: 0, width: 4, height: 1 }, '你', style);
    buffer.fill({ x: 1, y: 1, width: 5, height: 1 }, '你', style);

    expect(symbols(buffer, 0)).toBe('.你你...');
    expect(symbols(buffer, 1)).toBe('.你你\uFFFD..');
    expect(buffer.get(2, 0)).toMatchObject({ width: 0, style });
    expect(buffer.get(5, 1)).toMatchObject({ width: 1, style });
  });

  it('wraps text by terminal cells', () => {
    const buffer = new CellBuffer(4, 3);
    const result = buffer.write('123456');

    expect(result).toEqual({
      rows: 2,
      cursor: { x: 2, y: 1 },
      truncated: false
    });
    expect(symbols(buffer, 0)).toBe('1234');
    expect(symbols(buffer, 1)).toBe('56  ');
  });

  it('keeps wide graphemes in one cell pair', () => {
    const family = '👨‍👩‍👧‍👦';
    const buffer = new CellBuffer(4, 2);
    buffer.write(`${family}你好`);

    expect(buffer.get(0, 0)).toMatchObject({ symbol: family, width: 2 });
    expect(buffer.get(1, 0)).toMatchObject({ symbol: '', width: 0 });
    expect(buffer.get(2, 0)).toMatchObject({ symbol: '你', width: 2 });
    expect(buffer.get(0, 1)).toMatchObject({ symbol: '好', width: 2 });
  });

  it('keeps structured span styles on cells', () => {
    const buffer = new CellBuffer(8, 1);
    buffer.write([{ text: 'red', style: { foreground: 'red', bold: true } }, { text: ' plain' }]);

    expect(buffer.get(0, 0).style).toEqual({ foreground: 'red', bold: true });
    expect(buffer.get(4, 0).style).toEqual({});
  });

  it('supports clipping without terminal-side wrapping', () => {
    const buffer = new CellBuffer(4, 1);
    const result = buffer.write('abcdef', { wrap: false });

    expect(symbols(buffer, 0)).toBe('abcd');
    expect(result.truncated).toBe(true);
  });

  it('does not treat embedded terminal controls as text styling', () => {
    const buffer = new CellBuffer(8, 1);
    buffer.write('\x1B[31mred');

    expect(symbols(buffer, 0)).toBe('[31mred ');
  });
});

describe('text measurement', () => {
  it('distinguishes soft wraps from newlines, including wide-character padding', () => {
    const { buffer, rows } = layoutTextBuffer('abcd你\nlast\n', 5);
    expect(buffer.height).toBe(4);
    expect(rows).toEqual([
      { end: 4, wrapped: true },
      { end: 2, wrapped: false },
      { end: 4, wrapped: false },
      { end: 0, wrapped: false }
    ]);
  });

  it('allocates only the measured rows for committed text', () => {
    const { buffer } = layoutTextBuffer('x'.repeat(10000), 120);
    expect(buffer.width).toBe(120);
    expect(buffer.height).toBe(84);
  });

  it.each([
    { text: '', width: 4, rows: 0 },
    { text: '1234', width: 4, rows: 1 },
    { text: '12345', width: 4, rows: 2 },
    { text: '1234\n', width: 4, rows: 2 },
    { text: '\n\n', width: 4, rows: 3 },
    { text: 'a\r\nb\rc', width: 4, rows: 2 },
    { text: 'a\tb', width: 4, rows: 1 },
    { text: '\t\tX', width: 1, rows: 1 },
    { text: 'a你好', width: 4, rows: 2 },
    { text: '👨‍👩‍👧‍👦e\u0301X', width: 4, rows: 1 },
    { text: '\x00\x07\x1B', width: 4, rows: 0 },
    {
      text: [{ text: 'abc', style: { foreground: 'red' } }, { text: '你好\n' }] as Text,
      width: 4,
      rows: 3
    }
  ])('measures $text at width $width as $rows rows', ({ text, width, rows }) => {
    const result = measureText(text, width);
    expect(result.rows).toBe(rows);
    expect(result.truncated).toBe(false);
    expect(result).toEqual(new CellBuffer(width, 20).write(text));
  });

  it.each([
    { wrap: true, expected: { rows: 2, cursor: { x: 2, y: 2 }, truncated: true }, lines: ['..ab......', '..你好....'] },
    { wrap: false, expected: { rows: 1, cursor: { x: 5, y: 1 }, truncated: true }, lines: ['..ab......', '..........'] }
  ])('honors bounds and custom tab stops with wrap=$wrap', ({ wrap, expected, lines }) => {
    const text = 'ab\t你好\nlast';
    const options = { x: 2, y: 1, width: 4, height: 2, tabWidth: 3, wrap };
    const buffer = new CellBuffer(10, 5);
    buffer.fill(buffer.area, '.');
    expect(measureText(text, 10, options)).toEqual(expected);
    expect(buffer.write(text, options)).toEqual(expected);
    expect(Array.from({ length: 5 }, (_, row) => symbols(buffer, row))).toEqual([
      '..........',
      ...lines,
      '..........',
      '..........'
    ]);
  });
});

function symbols(buffer: CellBuffer, row: number) {
  return buffer
    .row(row)
    .filter((cell) => cell.width !== 0)
    .map((cell) => cell.symbol)
    .join('');
}
