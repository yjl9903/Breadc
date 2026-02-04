import type { Writable } from 'stream';

import readline from 'readline';

export class Terminal {
  public readonly stream: Writable;

  public readonly isTTY: boolean;

  private linewrap = true;

  private dy = 0;

  constructor(outputStream: Writable) {
    this.stream = outputStream;
    // @ts-ignore
    this.isTTY = !!outputStream.isTTY;
  }

  // save cursor position + settings
  cursorSave() {
    if (!this.isTTY) {
      return;
    }

    // save position
    this.stream.write('\x1B7');
  }

  // restore last cursor position + settings
  cursorRestore() {
    if (!this.isTTY) {
      return;
    }

    // restore cursor
    this.stream.write('\x1B8');
  }

  // show/hide cursor
  cursor(enabled: boolean) {
    if (!this.isTTY) {
      return;
    }

    if (enabled) {
      this.stream.write('\x1B[?25h');
    } else {
      this.stream.write('\x1B[?25l');
    }
  }

  // change cursor positionn
  cursorTo(x: number, y: number | undefined) {
    if (!this.isTTY) {
      return;
    }

    // move cursor absolute
    readline.cursorTo(this.stream, x, y);
  }

  // change relative cursor position
  cursorRelative(dx: number, dy: number) {
    if (!this.isTTY) {
      return;
    }

    // store current position
    this.dy = this.dy + dy;

    // move cursor relative
    readline.moveCursor(this.stream, dx, dy);
  }

  // relative reset
  cursorRelativeReset() {
    if (!this.isTTY) {
      return;
    }

    // move cursor to initial line
    readline.moveCursor(this.stream, 0, -this.dy);

    // first char
    readline.cursorTo(this.stream, 0, undefined);

    // reset counter
    this.dy = 0;
  }

  // clear to the right from cursor
  clearRight() {
    if (!this.isTTY) {
      return;
    }

    readline.clearLine(this.stream, 1);
  }

  // clear the full line
  clearLine() {
    if (!this.isTTY) {
      return;
    }

    readline.clearLine(this.stream, 0);
  }

  // clear everyting beyond the current line
  clearBottom() {
    if (!this.isTTY) {
      return;
    }

    readline.clearScreenDown(this.stream);
  }

  // add new line; increment counter
  newline() {
    this.stream.write('\n');
    this.dy++;
  }

  // write content to output stream
  // @TODO use string-width to strip length
  write(s: string, rawWrite = false) {
    // line wrapping enabled ? trim output
    if (this.linewrap === true && rawWrite === false) {
      this.stream.write(s.slice(0, this.getWidth()));
    } else {
      this.stream.write(s);
    }
  }

  // control line wrapping
  lineWrapping(enabled: boolean) {
    if (!this.isTTY) {
      return;
    }

    // store state
    this.linewrap = enabled;
    if (enabled) {
      this.stream.write('\x1B[?7h');
    } else {
      this.stream.write('\x1B[?7l');
    }
  }

  // get terminal width
  getWidth() {
    // set max width to 80 in tty-mode and 200 in notty-mode
    // @ts-ignore
    return this.stream.columns ?? (this.isTTY ? 80 : 200);
  }
}
