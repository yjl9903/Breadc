import { describe, expect, it } from 'vitest';

import Breadc from '../src';

describe('Breadc', () => {
  it('should parse', () => {
    expect(Breadc('cli').parse(['hello', 'world'])).toMatchInlineSnapshot(`
      {
        "_": [
          "hello",
          "world",
        ],
      }
    `);
  });

  it('should parse option', () => {
    expect(Breadc('cli').parse(['--root'])).toMatchInlineSnapshot(`
      {
        "_": [],
        "root": true,
      }
    `);

    expect(Breadc('cli').parse(['--root', 'folder'])).toMatchInlineSnapshot(`
      {
        "_": [],
        "root": "folder",
      }
    `);

    expect(Breadc('cli').parse(['--root', 'folder', 'text'])).toMatchInlineSnapshot(`
      {
        "_": [
          "text",
        ],
        "root": "folder",
      }
    `);

    expect(Breadc('cli').option('--root').parse(['--root', 'folder', 'text']))
      .toMatchInlineSnapshot(`
      {
        "_": [
          "folder",
          "text",
        ],
        "root": true,
      }
    `);

    expect(Breadc('cli').option('--root').parse(['folder', '--root', 'text']))
      .toMatchInlineSnapshot(`
      {
        "_": [
          "folder",
          "text",
        ],
        "root": true,
      }
    `);

    expect(
      Breadc('cli').option('--root').parse(['folder', 'text', '--root'])
    ).toMatchInlineSnapshot(`
      {
        "_": [
          "folder",
          "text",
        ],
        "root": true,
      }
    `);
  });
});
