import { breadc } from '../packages/breadc/src';

const cli = breadc('echo', { version: '1.0.0' })
  .option('--host <host>', { default: 'localhost' })
  .option('--port <port>', { default: '3000', cast: (t) => +t });

cli.command('[message]', 'Say something!').action((_message, option) => {
  const message = _message;
  console.log(message ?? 'You can say anything!');
  const host = option.host;
  const port = option.port;
  console.log(`Host: ${host}`);
  console.log(`Port: ${port}`);
});

cli.run(process.argv.slice(2)).catch((err) => console.error(err));
