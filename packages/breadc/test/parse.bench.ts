import { bench, describe } from 'vitest';

import cac from 'cac';
import { breadc } from '../src';

describe('Init empty cli', () => {
  bench('Breadc', () => {
    breadc('cli', { version: '0.0.0', description: 'This is an empty cli' });
  });

  bench('cac', () => {
    const cli = cac('cli');
    cli.help();
    cli.version('0.0.0');
  });
});

describe('Parse simple option', () => {
  const b = breadc('cli');
  b.option('--flag')
    .command('')
    .action(() => {});

  const c = cac('cli');
  c.option('--flag', '')
    .command('')
    .action(() => {});

  const args = ['--flag'];

  bench('Breadc', () => {
    b.parse(args);
  });

  bench('cac', () => {
    c.parse(args);
  });
});

describe('Parse more option', () => {
  const b = breadc('cli');
  b.option('--flag')
    .option('--host <addr>')
    .option('--local')
    .option('--root <root>')
    .command('')
    .action(() => {});

  const c = cac('cli');
  c.option('--flag', '')
    .option('--host <addr>', '')
    .option('--local', '')
    .option('--root <root>', '')
    .command('')
    .action(() => {});

  const args = ['--flag', '--host', '1.1.1.1', '--local', '--root=./'];

  bench('Breadc', () => {
    b.parse(args);
  });

  bench('cac', () => {
    c.parse(args);
  });
});

describe('Parse sub-commands', () => {
  const action = () => {};

  bench('Breadc', () => {
    const b = breadc('cli');
    b.command('[op]').action(action);
    b.command('dev').action(action);
    b.command('build <root>').action(action);
    b.command('preview').action(action);
    b.command('test [case]').action(action);
    b.command('run [...args]').action(action);

    b.parse(['op']);
    b.parse(['dev']);
    b.parse(['build', 'root']);
    b.parse(['preview']);
    b.parse(['test']);
    b.parse(['test', '1']);
    b.parse(['run', 'a', 'b', 'c', 'd', 'e']);
  });

  bench('cac', () => {
    const c = cac('cli');
    c.command('[op]').action(action);
    c.command('dev').action(action);
    c.command('build <root>').action(action);
    c.command('preview').action(action);
    c.command('test [case]').action(action);
    c.command('run [...args]').action(action);

    c.parse(['op']);
    c.parse(['dev']);
    c.parse(['build', 'root']);
    c.parse(['preview']);
    c.parse(['test']);
    c.parse(['test', '1']);
    c.parse(['run', 'a', 'b', 'c', 'd', 'e']);
  });
});
