import Breadc from '../src';

const cli = Breadc('echo', { version: '1.0.0' })
  .option('--host <host>', { default: 'localhost' })
  .option('--port <port>', { construct: (port) => (port ? +port : 3000) });

cli.command('[message]', 'Say something!').action((message, option) => {
  console.log(message ?? 'You can say anything!');
  const host = option.host;
  const port = option.port;
  console.log(`Host: ${host}`);
  console.log(`Port: ${port}`);
});

cli.run(process.argv.slice(2)).catch((err) => cli.logger.error(err.message));
