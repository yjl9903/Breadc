import { breadc } from '../packages/core/src';

const cli = breadc('echo', { version: '1.0.0' })
  .option('--host <host>', 'Listen host', { initial: 'localhost' })
  .option('--port <port>', 'Listen port', { initial: '3000', cast: (t) => +t });

cli
  .command('', 'Listen and say something!')
  .argument('[message]', { initial: 'Breadc' })
  .action((message, option) => {
    const { host, port } = option;
    console.log(message);
    console.log(`Listen on: http://${host}:${port}`);
  });

cli.run(process.argv.slice(2)).catch((err) => console.error(err));
