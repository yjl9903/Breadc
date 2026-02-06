import { breadc } from '../packages/core/src';

const cli = breadc('echo', { version: '1.0.0' })
  .option('--host <host>', 'specify hostname', { initial: 'localhost' })
  .option('--port <port>', 'specify port', { initial: '3000', cast: (t) => +t });

cli.command('[message]', 'Say something!').action((message, option) => {
  console.log(message ?? 'You can say anything!');
  const { host, port } = option; // { host: string, port: number, '--': string[] }
  console.log(`Host: ${host}`);
  console.log(`Port: ${port}`);
});

cli.run(process.argv.slice(2)).catch((err) => console.error(err));
