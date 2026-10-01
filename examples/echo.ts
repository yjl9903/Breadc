import { z } from 'zod';
import { breadc } from '../packages/core/src';

const cli = breadc('echo', { version: '1.0.0' })
  .option('--host <host>', 'Listen host', { default: 'localhost' })
  .option('--port <port>', 'Listen port', {
    default: '3000',
    cast: z.coerce.number().int().min(1).max(65535)
  });

cli
  .command('', 'Listen and say something!')
  .argument('[message]', { default: 'Breadc' })
  .action((message, option) => {
    const { host, port } = option;
    console.log(message);
    console.log(`Listen on: http://${host}:${port}`);
  });

cli.run(process.argv.slice(2)).catch((err) => console.error(err));
