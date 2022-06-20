import Breadc from '../src';

const cli = Breadc('echo', { version: '1.0.0' }).option('--host <host>').option('--port <port>');

cli.command('[message]').action((message, option) => {
  console.log(message ?? 'You can say anything!');
  console.log(`Host: ${option.host}`);
  console.log(`Port: ${option.port}`);
});

cli.run(process.argv.slice(2)).catch((err) => cli.logger.error(err.message));
