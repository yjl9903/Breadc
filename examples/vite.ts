import { breadc } from '../packages/breadc/src';

const vite = breadc('vite', {
  version: '1.0.0',
  description: 'Next generation frontend tooling.'
})
  .option('-c, --config <file>', `[string] use specified config file`)
  .option('--base <path>', `[string] public base path (default: /)`, {
    default: '/'
  })
  .option('-l, --logLevel <level>', `[string] info | warn | error | silent`)
  .option('--clear-screen', `[boolean] allow/disable clear screen when logging`)
  .option('-d, --debug <feat>', `[string | boolean] show debug logs`)
  .option('-f, --filter <filter>', `[string] filter debug logs`)
  .option('-m, --mode <mode>', `[string] set env mode`);

vite
  .command('dev [root]', { description: 'start dev server' })
  .option('--host <host>', `[string] specify hostname`)
  .option('--port <port>', `[number] specify port`)
  .option('--https', `<boolean> use TLS + HTTP/2`)
  .option('--open <path>', `[boolean | string] open browser on startup`)
  .option('--cors', `[boolean] enable CORS`)
  .option('--strict-port', `[boolean] exit if specified port is already in use`)
  .option(
    '--force',
    `[boolean] force the optimizer to ignore the cache and re-bundle`
  )
  .action(async (root, option) => {
    console.log(`Root: ${root}`);
    console.log(`Option:`);
    console.log(option);
  });

vite.run(process.argv.slice(2));
// .catch((err) => vite.logger.error(err.message));
