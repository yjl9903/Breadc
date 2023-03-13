import type { Writable } from 'node:stream';

export interface SpinnerOptions {
  stream: Writable;

  interval: number;

  frames: string[];
}

export function spinner(options: Partial<SpinnerOptions> = {}) {
  const stream = options.stream ?? process.stderr;
  const interval = options.interval ?? 100;
  const frames = options.frames ?? ['◒', '◐', '◓', '◑'];

  return {
    start(title: string) {},
    success(title: string) {},
    fail(title: string) {},
    stop(title: string) {}
  };
}
