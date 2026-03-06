import readline from 'node:readline';

import type { Frame } from './frame.ts';
import type { OutputStream } from './types.ts';

import { stringWidth } from './string-width.ts';

/**
 * 将上一帧到下一帧的变更应用到 TTY 底部区域。
 */
export function applyFramePatchTTY(stream: OutputStream, previous: Frame, next: Frame) {
  const output = stream as NodeJS.WriteStream;
  const patch = previous.diff(next);
  if (patch.kind === 'noop') {
    return;
  }

  let cursorRowIndex = previous.rows.length - 1;

  if (patch.kind === 'reflow') {
    const { prefixRowCount, nextRows } = patch;
    const clearCount = previous.rows.length - prefixRowCount;

    if (clearCount > 0) {
      const startRow = Math.min(prefixRowCount, previous.rows.length - 1);
      cursorRowIndex = moveCursorToRowStartTTY(output, cursorRowIndex, startRow);

      for (let i = 0; i < clearCount; i += 1) {
        readline.cursorTo(output, 0);
        readline.clearLine(output, 0);
        if (i < clearCount - 1) {
          readline.moveCursor(output, 0, 1);
          cursorRowIndex += 1;
        }
      }

      if (clearCount > 1) {
        readline.moveCursor(output, 0, -(clearCount - 1));
        cursorRowIndex -= clearCount - 1;
      }

      const rewriteRows = nextRows.slice(prefixRowCount);
      for (let i = 0; i < rewriteRows.length; i += 1) {
        stream.write(rewriteRows[i]);
        if (i < rewriteRows.length - 1) {
          stream.write('\n');
          cursorRowIndex += 1;
        }
      }
    } else {
      const appendRows = nextRows.slice(prefixRowCount);
      for (const row of appendRows) {
        stream.write('\n');
        cursorRowIndex += 1;
        stream.write(row);
      }
    }

    moveCursorToFrameEndTTY(output, cursorRowIndex, nextRows);
    return;
  }

  for (const rowPatch of patch.rowPatches) {
    cursorRowIndex = moveCursorToRowStartTTY(output, cursorRowIndex, rowPatch.rowIndex);
    readline.cursorTo(output, rowPatch.startColumn);
    eraseColumnsTTY(output, rowPatch.deleteColumns);
    stream.write(rowPatch.insertText);
  }

  moveCursorToFrameEndTTY(output, cursorRowIndex, patch.nextRows);
}

function moveCursorToRowStartTTY(output: NodeJS.WriteStream, currentRow: number, targetRow: number) {
  if (targetRow !== currentRow) {
    readline.moveCursor(output, 0, targetRow - currentRow);
  }
  readline.cursorTo(output, 0);
  return targetRow;
}

function moveCursorToFrameEndTTY(output: NodeJS.WriteStream, currentRow: number, rows: string[]) {
  if (rows.length === 0) {
    return;
  }

  const targetRow = rows.length - 1;
  if (targetRow !== currentRow) {
    readline.moveCursor(output, 0, targetRow - currentRow);
  }

  readline.cursorTo(output, stringWidth(rows[targetRow]));
}

function eraseColumnsTTY(output: NodeJS.WriteStream, columns: number) {
  if (columns <= 0) {
    return;
  }

  output.write(`\x1B[${columns}X`);
}
