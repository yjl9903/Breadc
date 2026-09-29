import xterm from '@xterm/headless';

import { MemoryStream } from './stream.ts';

const { Terminal } = xterm;

/** A real terminal interpreter attached to the same capture stream used by protocol tests. */
export class TerminalStream extends MemoryStream {
  readonly terminal: InstanceType<typeof Terminal>;

  constructor(columns = 20, rows = 6) {
    super(true, columns, rows);
    this.terminal = new Terminal({ cols: columns, rows, allowProposedApi: true, convertEol: true });
  }

  override _write(chunk: Buffer, _encoding: BufferEncoding, callback: () => void) {
    this.chunks.push(chunk.toString());
    this.terminal.write(chunk, callback);
  }

  /** Drain queued widget microtasks, then wait until xterm has consumed all writes. */
  async flush() {
    await Promise.resolve();
    await new Promise<void>((resolve, reject) => this.write('', (error) => (error ? reject(error) : resolve())));
    // The drain marker is not application output.
    if (this.chunks.at(-1) === '') this.chunks.pop();
  }

  resize(rows: number, columns = this.columns) {
    this.rows = rows;
    this.columns = columns;
    this.terminal.resize(columns, rows);
  }

  /** Preserve blank rows, including unused screen space, unless the test explicitly crops it. */
  lines(visibleOnly = false) {
    const buffer = this.terminal.buffer.active;
    const start = visibleOnly ? buffer.baseY : 0;
    return Array.from({ length: buffer.length - start }, (_, i) =>
      buffer
        .getLine(start + i)!
        .translateToString(true)
        .trimEnd()
    );
  }

  /** Ignore only outer padding; blank separators inside the content remain significant. */
  content(visibleOnly = false) {
    return trimPadding(this.lines(visibleOnly));
  }

  /** Read history above a bottom-anchored viewport, cropping only surrounding unused rows. */
  aboveViewport(height: number) {
    return trimPadding(this.lines().slice(0, -height));
  }

  get screen() {
    return this.lines(true);
  }

  get scrollback() {
    return this.lines().slice(0, this.terminal.buffer.active.baseY);
  }

  get cursor() {
    const buffer = this.terminal.buffer.active;
    return { x: buffer.cursorX, y: buffer.cursorY };
  }

  cell(x: number, y: number) {
    const buffer = this.terminal.buffer.active;
    return buffer.getLine(buffer.baseY + y)!.getCell(x)!;
  }

  async dispose() {
    await this.flush();
    this.terminal.dispose();
    this.destroy();
  }
}

function trimPadding(lines: string[]) {
  const first = lines.findIndex((line) => line !== '');
  if (first === -1) return [];
  let end = lines.length;
  while (lines[end - 1] === '') end -= 1;
  return lines.slice(first, end);
}
