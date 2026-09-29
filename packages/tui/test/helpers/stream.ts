import { Writable } from 'node:stream';

/** Capture writes without interpreting terminal controls. Used for pipe/protocol contracts. */
export class MemoryStream extends Writable {
  readonly chunks: string[] = [];

  constructor(
    readonly isTTY: boolean,
    public columns = 20,
    public rows = 8
  ) {
    super();
  }

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.chunks.push(chunk.toString());
    callback();
  }

  output() {
    return this.chunks.join('');
  }

  reset() {
    this.chunks.length = 0;
  }
}
