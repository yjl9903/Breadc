import { describe, expect, it } from 'vitest';

import { Frame } from '../src/render/frame.ts';

describe('frame', () => {
  it('computes physical rows by terminal columns', () => {
    const frame = Frame.from(['123456', 'ab'], 4);
    expect(frame.lines).toEqual(['123456', 'ab']);
    expect(frame.rows).toEqual(['1234', '56', 'ab']);
  });

  it('counts wide characters correctly', () => {
    const frame = Frame.from(['你好ab'], 4);
    expect(frame.lines).toEqual(['你好ab']);
    expect(frame.rows).toEqual(['你好', 'ab']);
  });

  it('does not break emoji grapheme clusters', () => {
    const family = '👨‍👩‍👧‍👦';
    const frame = Frame.from([`${family}a`], 2);

    expect(frame.lines).toEqual([`${family}a`]);
    expect(frame.rows).toEqual([family, 'a']);
  });

  it('compares logical lines for no-op rendering', () => {
    const a = Frame.from(['build 30%']);
    const b = Frame.from(['build 30%']);
    const c = Frame.from(['build 40%']);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('returns noop patch for identical frame', () => {
    const a = Frame.from(['hello', 'world'], 10);
    const b = Frame.from(['hello', 'world'], 10);

    expect(a.diff(b)).toEqual({ kind: 'noop' });
  });

  it('returns reflow patch when row count changed', () => {
    const previous = Frame.from(['1234'], 4);
    const next = Frame.from(['12345'], 4);

    expect(previous.diff(next)).toEqual({
      kind: 'reflow',
      prefixRowCount: 1,
      nextRows: ['1234', '5']
    });
  });

  it('returns row-diff patch when row count unchanged', () => {
    const previous = Frame.from(['build 30%'], 20);
    const next = Frame.from(['build 40%'], 20);

    expect(previous.diff(next)).toEqual({
      kind: 'row-diff',
      nextRows: ['build 40%'],
      rowPatches: [
        {
          rowIndex: 0,
          startColumn: 6,
          deleteColumns: 3,
          insertText: '40%'
        }
      ]
    });
  });
});
