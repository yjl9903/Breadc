import { describe, expect, it } from 'vitest';

import { wrapLineByWidth, wrapLinesByWidth } from '../src/render/wrap.ts';

describe('string-width wrap', () => {
  it('wraps ascii by columns', () => {
    expect(wrapLineByWidth('123456', 4)).toEqual(['1234', '56']);
  });

  it('keeps grapheme clusters intact', () => {
    const family = '👨‍👩‍👧‍👦';
    expect(wrapLineByWidth(`${family}a`, 2)).toEqual([family, 'a']);
  });

  it('keeps ansi escape codes with text', () => {
    const red = '\u001B[31m';
    const reset = '\u001B[39m';
    const line = `${red}ab${reset}cd`;
    expect(wrapLineByWidth(line, 2)).toEqual([`${red}ab`, `${reset}cd`]);
  });

  it('wraps multiple logical lines', () => {
    expect(wrapLinesByWidth(['abc', '12345'], 3)).toEqual(['abc', '123', '45']);
  });
});
