import Breadc from '../src';

const vite = Breadc('vite', { version: '1.0.0' })
  .option('-c, --config <file>', { description: `[string] use specified config file` })
  .option('--base <path>', { description: `[string] public base path (default: /)` })
  .option('-l, --logLevel <level>', { description: `[string] info | warn | error | silent` })
  .option('--clearScreen', { description: `[boolean] allow/disable clear screen when logging` })
  .option('-d, --debug [feat]', { description: `[string | boolean] show debug logs` })
  .option('-f, --filter <filter>', { description: `[string] filter debug logs` })
  .option('-m, --mode <mode>', { description: `[string] set env mode` });

vite
  .command('dev [root]', { description: 'start dev server' })
  // .option('--host [host]', { description: `[string] specify hostname` })
  // .option('--port <port>', { description: `[number] specify port` })
  // .option('--https', { description: `[boolean] use TLS + HTTP/2` })
  // .option('--open [path]', { description: `[boolean | string] open browser on startup` })
  // .option('--cors', { description: `[boolean] enable CORS` })
  // .option('--strictPort', { description: `[boolean] exit if specified port is already in use` })
  // .option('--force', {
  //   description: `[boolean] force the optimizer to ignore the cache and re-bundle`
  // })
  .action(async (root, option) => {});

vite.run(process.argv.slice(2)).catch((err) => vite.logger.error(err.message));
