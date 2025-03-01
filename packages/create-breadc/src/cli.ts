import { Breadc } from '@breadc/core';

import { version } from '../package.json';

const cli = new Breadc('create-breadc', { version });

cli.command('[root]', 'Create breadc project').action((root, option) => {});

cli.run(process.argv.slice(2)).catch((err) => console.error(err));
