import { describe, expect, it } from 'vitest';

import Breadc from '../src';
import { createDefaultLogger } from '../src/logger';

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

  it('should parse boolean option', () => {
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

    expect(Breadc('cli').option('--root').parse(['folder', 'text', '--root']))
      .toMatchInlineSnapshot(`
      {
        "_": [
          "folder",
          "text",
        ],
        "root": true,
      }
    `);
  });

  it('should parse boolean option with shortcut', () => {
    const parser = Breadc('cli').option('-r, --root');

    expect(parser.parse([])).toMatchInlineSnapshot(`
      {
        "_": [],
        "r": false,
        "root": false,
      }
    `);

    expect(parser.parse(['--root'])).toMatchInlineSnapshot(`
      {
        "_": [],
        "r": true,
        "root": true,
      }
    `);

    expect(parser.parse(['-r'])).toMatchInlineSnapshot(`
      {
        "_": [],
        "r": true,
        "root": true,
      }
    `);

    expect(parser.parse(['-r', 'root'])).toMatchInlineSnapshot(`
      {
        "_": [
          "root",
        ],
        "r": true,
        "root": true,
      }
    `);

    expect(parser.parse(['root', '-r'])).toMatchInlineSnapshot(`
      {
        "_": [
          "root",
        ],
        "r": true,
        "root": true,
      }
    `);
  });

  it('should not parse wrong option', () => {
    const output: string[] = [];
    const logger = createDefaultLogger('cli');
    logger.warn = (message: string) => {
      output.push(message);
    };
    Breadc('cli', { logger }).option('invalid');

    expect(output).toMatchInlineSnapshot(`
      [
        "Can not extract option name from \\"invalid\\"",
      ]
    `);
  });
});
