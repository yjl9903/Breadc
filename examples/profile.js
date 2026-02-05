import { Breadc } from '../dist/index.mjs';

for (let i = 0; i < 10000; i++) {
  const b = new Breadc('cli');
  const action = () => {};
  b.command('[op]').action(action);
  b.command('dev').action(action);
  b.command('build <root>').action(action);
  b.command('preview').action(action);
  b.command('test [case]').action(action);
  b.command('run [...args]').action(action);

  b.parse(['run', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n']);
}
