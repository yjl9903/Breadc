import type { BreadcOutput } from './types.ts';

const consoleOutput: BreadcOutput = {
  write(text) {
    // console.log supplies the final newline; preserve any preceding blank lines.
    console.log(text.endsWith('\n') ? text.slice(0, -1) : text);
  }
};

export function getDefaultOutput(): BreadcOutput {
  const stdout = typeof process === 'undefined' ? undefined : process?.stdout;
  return typeof stdout?.write === 'function' ? stdout : consoleOutput;
}
