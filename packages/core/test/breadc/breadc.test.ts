import { describe, it, expect } from 'vitest';

import { Breadc, Option, Command } from '../../src/index.ts';

describe('breadc', () => {
  it('should create breadc', () => {
    new Breadc('cli', { version: '0.0.0', description: 'app' });
  });

  it('should create the same option in breadc', () => {
    const app = new Breadc('cli');
    app
      .addOption(new Option('--name <name>'))
      .addCommand(new Command(''))
      .action((option) => option.name);
    expect(app.runSync(['--name', 'name'])).toMatchInlineSnapshot(`"name"`);
  });

  it('should create the same option in command', () => {
    const app = new Breadc('cli');
    app
      .addCommand(new Command(''))
      .addOption(new Option('--name <name>'))
      .action((option) => option.name);
    expect(app.runSync(['--name', 'name'])).toMatchInlineSnapshot(`"name"`);
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
