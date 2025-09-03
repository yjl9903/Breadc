import { breadc } from 'breadc';

import { version } from '../package.json';

const cli = breadc('breadcpack', { version });

cli.command('[root]', 'Create breadc project').action((root, option) => {});

cli.run(process.argv.slice(2)).catch((err) => console.error(err));
