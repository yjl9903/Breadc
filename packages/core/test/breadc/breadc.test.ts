import { describe, it, expect } from 'vitest';

import { Breadc } from '../../src/index.ts';

describe('breadc', () => {
  it('should create breadc', () => {
    new Breadc('cli', { version: '0.0.0', description: 'app' });
  });

  it('should not parse duplicated default command', () => {
    expect(() => {
      const app = new Breadc('cli');
      app.command('');
      app.command('[flag]');
      app.runSync([]);
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: Find duplicated default commands]`
    );

    expect(() => {
      const app = new Breadc('cli');
      app.command('');
      app.command('<flag>');
      app.runSync([]);
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: Find duplicated default commands]`
    );

    expect(() => {
      const app = new Breadc('cli');
      app.command('[flag]');
      app.command('');
      app.runSync([]);
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: Find duplicated default commands]`
    );

    expect(() => {
      const app = new Breadc('cli');
      app.command('[flag]');
      app.command('<flag>');
      app.runSync([]);
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: Find duplicated default commands]`
    );

    expect(() => {
      const app = new Breadc('cli');
      app.command('<flag>');
      app.command('');
      app.runSync([]);
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: Find duplicated default commands]`
    );

    expect(() => {
      const app = new Breadc('cli');
      app.command('<flag>');
      app.command('[flag]');
      app.runSync([]);
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: Find duplicated default commands]`
    );
  });
});
