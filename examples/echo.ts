import { z } from 'zod';
import { breadc } from '../packages/core/src';

const cli = breadc('echo', { version: '1.0.0' })
  .option('--host <host>', 'specify hostname', { default: 'localhost' })
  .option('--port <port>', 'specify port', {
    default: '3000',
    cast: z.coerce.number().int().min(1).max(65535)
  });



cli.command('[message]', 'Say something!').action((message, option) => {
  console.log(message ?? 'You can say anything!');
  const { host, port } = option; // { host: string, port: number, '--': string[] }
  console.log(`Host: ${host}`);
  console.log(`Port: ${port}`);
});

cli.run(process.argv.slice(2)).catch((err) => console.error(err));
