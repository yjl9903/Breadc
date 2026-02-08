import { describe, expect, it } from 'vitest';

import { camelCase, splitOnce, stripPrefix } from '../src/utils/string';

describe('utils/string', () => {
  it('stripPrefix', () => {
    expect(stripPrefix('abc', 'a')).toMatchInlineSnapshot(`"bc"`);
    expect(stripPrefix('abc', 'd')).toMatchInlineSnapshot(`undefined`);
  });

  it('splitOnce', () => {
    expect(splitOnce('a=bc', '=')).toMatchInlineSnapshot(`
      [
        "a",
        "bc",
      ]
    `);
    expect(splitOnce('a=bc', ',')).toMatchInlineSnapshot(`
      [
        "a=bc",
        undefined,
      ]
    `);
  });

  it('camelCase', () => {
    expect(camelCase('flag')).toMatchInlineSnapshot(`"flag"`);
    expect(camelCase('bao-zhi-guo')).toMatchInlineSnapshot(`"baoZhiGuo"`);
  });
});
