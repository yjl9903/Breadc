import { describe, expect, it } from 'vitest';

import { renderCells } from '../../src/render/style.ts';
import type { TextStyle } from '../../src/render/types.ts';

describe('structured style encoding', () => {
  it.each<{ style: TextStyle; expected: string }>([
    { style: {}, expected: '\x1B[0mX\x1B[0m' },
    { style: { foreground: 'red', background: 'brightBlue' }, expected: '\x1B[0m\x1B[0m\x1B[31;104mX\x1B[0m' },
    { style: { foreground: 123, background: 42 }, expected: '\x1B[0m\x1B[0m\x1B[38;5;123;48;5;42mX\x1B[0m' },
    { style: { foreground: -1, background: 300 }, expected: '\x1B[0m\x1B[0m\x1B[38;5;0;48;5;255mX\x1B[0m' },
    {
      style: { foreground: '#AbC', background: '#123456' },
      expected: '\x1B[0m\x1B[0m\x1B[38;2;170;187;204;48;2;18;52;86mX\x1B[0m'
    },
    { style: { foreground: '#invalid' }, expected: '\x1B[0m\x1B[0mX\x1B[0m' },
    {
      style: { bold: true, dim: true, italic: true, underline: true, inverse: true, hidden: true, strikethrough: true },
      expected: '\x1B[0m\x1B[0m\x1B[1;2;3;4;7;8;9mX\x1B[0m'
    },
    { style: { bold: false, hidden: false }, expected: '\x1B[0m\x1B[0mX\x1B[0m' },
    {
      style: { link: 'https://example.com/\x07\x1B\x9B' },
      expected: '\x1B[0m\x1B[0m\x1B]8;;https://example.com/\x1B\\X\x1B]8;;\x1B\\\x1B[0m'
    }
  ])('encodes $style', ({ style, expected }) => {
    expect(renderCells([{ symbol: 'X', width: 1, style }], 0, 1)).toBe(expected);
  });
});
