import { bench, describe } from 'vitest';

import cac from 'cac';
import breadc from '../src';

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

describe('Parse option', () => {
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

describe('Parse array', () => {
  const b = breadc('cli');
  b.command('[...files]').action(() => {});

  const c = cac('cli');
  c.command('[...files]').action(() => {});

  const args = ['a', 'b', 'c', 'd'];

  bench('Breadc', () => {
    b.parse(args);
  });

  bench('cac', () => {
    c.parse(args);
  });
});
