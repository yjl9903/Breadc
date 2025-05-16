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

  it('should handle unknown command', () => {
    const app = new Breadc('cli').onUnknownCommand(() => true);
    expect(app.runSync(['hello'])).toMatchInlineSnapshot(`true`);
  });
});

describe('breadc hooks', () => {
  it('should run pre:action and post:action hook', () => {
    const app = new Breadc('cli');
    let count = 0;
    app
      .command('')
      .hook('pre:action', () => {
        count += 1;
        expect(count).toBe(1);
      })
      .hook('post:action', () => {
        count += 1;
        expect(count).toBe(3);
        return count;
      })
      .action(() => {
        count += 1;
        expect(count).toBe(2);
        return count;
      });
    expect(app.runSync([])).toMatchInlineSnapshot(`3`);
  });
});

describe('breadc errors', () => {
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

  it('should not run command without action', async () => {
    const cli = new Breadc('cli');
    cli.command('dev --name [...name]');

    expect(() =>
      cli.runSync(['dev', '--name', '123'])
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no action function bound in this command]`
    );
  });
});
