import { onDeath } from '@breadc/death';

import { clamp, normalizeNonNegativeInteger, normalizePositiveInteger } from '../utils/number.ts';

import type {
  DrawCallback,
  HitRegion,
  InlineRendererOptions,
  Point,
  OutputStream,
  Rect,
  RenderResult,
  Size,
  Text
} from './types.ts';

import { Frame } from './frame.ts';
import { CellBuffer, diffBuffers, layoutTextBuffer } from './buffer.ts';
import { contentEnd, renderCells } from './style.ts';

const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS = 24;
const DEFAULT_VIEWPORT_HEIGHT = 1;

const HIDE_CURSOR = '\x1B[?25l';
const SHOW_CURSOR = '\x1B[?25h';
const BEGIN_SYNCHRONIZED_UPDATE = '\x1B[?2026h';
const END_SYNCHRONIZED_UPDATE = '\x1B[?2026l';

/**
 * A render-only inline terminal surface.
 *
 * Stable output is inserted once above the surface and becomes native terminal
 * scrollback. Mutable output is fully drawn into a cell buffer and diffed
 * against the previous frame. Input handling is deliberately outside this
 * class; cursor and hit-region metadata are retained for a future controller.
 */
export class InlineRenderer {
  public readonly stream: OutputStream;

  public readonly isTTY: boolean;

  private size: Size;

  private viewportArea: Rect;

  private viewportReserved = false;

  private previousBuffer: CellBuffer | undefined;

  private previousCursor: Point | undefined;

  private cursorRow: number | undefined;

  private currentRegions: readonly HitRegion[] = [];

  private cursorHidden = false;

  private disposed = false;

  private batchDepth = 0;

  private pendingOutput = '';

  private cancelDeathHandler: (() => void) | undefined;

  private readonly exitHandler: () => void;

  constructor(options: InlineRendererOptions = {}) {
    this.stream = options.stream ?? process.stdout;
    this.isTTY = options.isTTY ?? !!this.stream.isTTY;
    this.exitHandler = options.onExit ?? (() => this.dispose());
    this.size = {
      width: normalizePositiveInteger(options.columns ?? this.stream.columns, DEFAULT_COLUMNS),
      height: normalizePositiveInteger(options.rows ?? this.stream.rows, DEFAULT_ROWS)
    };
    const viewportHeight = clampViewportHeight(options.viewportHeight ?? DEFAULT_VIEWPORT_HEIGHT, this.size.height);
    this.viewportArea = {
      x: 0,
      y: this.size.height - viewportHeight,
      width: this.size.width,
      height: viewportHeight
    };
  }

  get area(): Rect {
    return { ...this.viewportArea };
  }

  get regions(): readonly HitRegion[] {
    return this.currentRegions;
  }

  get terminalSize(): Size {
    return { ...this.size };
  }

  /** Batch commits and a live redraw into one synchronized terminal update. */
  batch<T>(update: () => T): T {
    this.ensureActive();
    this.batchDepth += 1;

    try {
      return update();
    } finally {
      this.batchDepth -= 1;
      if (this.batchDepth === 0) {
        this.flushPendingOutput();
      }
    }
  }

  /** Fully render the mutable viewport, then emit only changed cell runs. */
  render(draw: DrawCallback): RenderResult {
    this.ensureActive();
    const buffer = new CellBuffer(this.viewportArea.width, this.viewportArea.height);
    const frame = new Frame(buffer);
    draw(frame);

    const result: RenderResult = {
      changedCells: 0,
      area: this.area,
      ...(frame.cursor ? { cursor: { ...frame.cursor } } : {}),
      regions: frame.regions.map((region) => ({ ...region, area: { ...region.area } }))
    };
    this.currentRegions = result.regions;

    if (!this.isTTY) {
      return result;
    }

    this.batch(() => {
      this.reserveViewport();
      const firstFrame = !this.previousBuffer;
      if (!this.previousBuffer) {
        this.clearViewportInternal();
        this.previousBuffer = new CellBuffer(buffer.width, buffer.height);
      }

      const diff = diffBuffers(this.previousBuffer, buffer);
      if (firstFrame) {
        // Keep the live rows in one soft-wrapped block containing the cursor.
        // Terminals leave that active logical line for the application to
        // redraw on resize, instead of reflowing old live rows into history.
        // Padding each row also links empty rows to the same block.
        for (let y = 0; y < buffer.height; y += 1) {
          this.queue(renderCells(buffer.row(y), 0, buffer.width));
        }
        // Remove the padding without breaking the soft-wrap links. ECH keeps
        // those links, including on empty rows, whereas erasing a line does not.
        for (let y = 0; y < buffer.height; y += 1) {
          const end = contentEnd(buffer.row(y));
          if (end < buffer.width) {
            this.moveTo(end, this.viewportArea.y + y);
            this.queue(`\x1B[${buffer.width - end}X`);
          }
        }
      } else {
        for (const run of diff.runs) {
          this.moveTo(this.viewportArea.x + run.start, this.viewportArea.y + run.row);
          this.queue(renderCells(buffer.row(run.row), run.start, run.end));
        }
      }
      result.changedCells = diff.changedCells;

      this.updateCursor(frame.cursor, firstFrame || diff.runs.length > 0);
      this.previousBuffer = buffer;
      this.previousCursor = frame.cursor ? { ...frame.cursor } : undefined;
    });

    return result;
  }

  /**
   * Insert a fixed-height cell buffer before the live viewport.
   *
   * Use `batch(() => { insertBefore(...); render(...); })` so the commit and
   * replacement live frame are presented atomically.
   */
  insertBefore(height: number, draw: DrawCallback) {
    this.ensureActive();
    const insertHeight = normalizeNonNegativeInteger(height);
    if (insertHeight === 0) {
      return;
    }

    const buffer = new CellBuffer(this.viewportArea.width, insertHeight);
    draw(new Frame(buffer));

    this.commitBuffer(buffer);
  }

  /** Insert styled text once into native terminal scrollback. */
  commit(text: Text) {
    this.ensureActive();
    const { buffer, rows } = layoutTextBuffer(text, this.viewportArea.width);
    this.commitBuffer(buffer, rows);
  }

  /**
   * Adopt a new terminal size and invalidate the live frame.
   * Live rows already moved into scrollback by a terminal shrink remain there
   * when using an explicit cursor; cleanup is limited to the visible screen.
   */
  resize(size?: Partial<Size>) {
    this.ensureActive();
    const next = {
      width: normalizePositiveInteger(size?.width ?? this.stream.columns, this.size.width),
      height: normalizePositiveInteger(size?.height ?? this.stream.rows, this.size.height)
    };
    if (next.width === this.size.width && next.height === this.size.height) {
      return false;
    }

    this.batch(() => {
      const height = clampViewportHeight(this.viewportArea.height, next.height);
      let reserveRows = 0;
      if (this.viewportReserved && this.cursorRow !== undefined) {
        // Resizing can pull scrollback onto the screen and move the live frame.
        // The terminal preserves its cursor, so clear relative to that anchor
        // rather than erasing history at the old absolute viewport position.
        const offset = this.cursorRow - this.viewportArea.y;
        if (next.height < this.size.height) {
          // A visible cursor above the last live row can cause the terminal
          // to discard rows below it on shrink. Reserve their replacements
          // before moving the viewport upward over committed output.
          const top = Math.max(0, Math.min(this.cursorRow, next.height - 1) - offset);
          reserveRows = Math.max(0, top - (next.height - height));
        }
        this.queue('\r');
        if (offset > 0) {
          this.queue(`\x1B[${offset}A`);
        }
        this.queue('\x1B[J');
      }
      this.size = next;
      this.scrollUp(reserveRows);
      this.viewportArea = {
        x: 0,
        y: next.height - height,
        width: next.width,
        height
      };
      if (this.viewportReserved) {
        this.moveTo(this.viewportArea.x, this.viewportArea.y);
      }
      this.previousBuffer = undefined;
      this.previousCursor = undefined;
    });
    return true;
  }

  /** Resize the bottom-anchored mutable viewport without adding interaction. */
  setViewportHeight(height: number) {
    this.ensureActive();
    const nextHeight = clampViewportHeight(height, this.size.height);
    if (nextHeight === this.viewportArea.height) {
      return false;
    }

    this.batch(() => {
      if (this.viewportReserved) {
        this.clearViewportInternal();
        // Make room above the new viewport without erasing committed output.
        // Clear the old live frame first so it cannot enter scrollback.
        this.scrollUp(nextHeight - this.viewportArea.height);
      }
      this.viewportArea = {
        ...this.viewportArea,
        y: this.size.height - nextHeight,
        height: nextHeight
      };
      this.previousBuffer = undefined;
      this.previousCursor = undefined;
    });
    return true;
  }

  clear() {
    this.ensureActive();
    if (!this.viewportReserved) {
      return;
    }
    this.batch(() => {
      this.clearViewportInternal();
      this.showCursor();
      this.previousBuffer = undefined;
      this.previousCursor = undefined;
    });
  }

  /** Clear the live frame and let the caller write directly to the stream. */
  release() {
    this.clear();
    // The caller can move the cursor or scroll after this point. Reserve a
    // fresh viewport on the next draw, and never erase the released area.
    this.viewportReserved = false;
    this.cursorRow = undefined;
    this.currentRegions = [];
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.release();
    this.disposed = true;
  }

  private commitBuffer(buffer: CellBuffer, rows?: { end: number; wrapped: boolean }[]) {
    if (buffer.height === 0) {
      return;
    }
    if (!this.isTTY) {
      this.stream.write(`${bufferToPlainText(buffer)}\n`);
      return;
    }

    this.batch(() => {
      this.reserveViewport();
      this.clearViewportInternal();
      for (let y = 0; y < buffer.height; y += 1) {
        const cells = buffer.row(y);
        // Text layout preserves soft wraps; fixed buffers use explicit line breaks.
        if (y > 0 && !rows?.[y - 1].wrapped) {
          this.queue('\r\n');
        } else if (y > 0 && rows?.[y - 1].end === buffer.width - 1 && cells[0].width !== 2) {
          // A wide character may have caused the wrap before CR/BS overwrote
          // it with narrow text. Recreate that wrap with a wide placeholder,
          // then erase it without removing the terminal's soft-wrap link.
          this.queue('\u3000\r\x1B[2X');
        }
        this.queue(renderCells(cells, 0, rows?.[y].end ?? contentEnd(cells)));
      }
      this.queue('\r\n'.repeat(this.viewportArea.height));
      this.clearViewportInternal();
      this.previousBuffer = undefined;
      this.previousCursor = undefined;
    });
  }

  private scrollUp(lines: number) {
    if (lines <= 0) {
      return;
    }
    this.moveTo(0, this.size.height - 1);
    this.queue('\r\n'.repeat(lines));
  }

  private clearViewportInternal() {
    this.moveTo(this.viewportArea.x, this.viewportArea.y);
    this.queue('\x1B[J');
  }

  private reserveViewport() {
    if (this.viewportReserved) {
      return;
    }
    // Existing terminal rows belong to the caller. Scroll in a fresh region
    // before the first draw or commit instead of clearing their output.
    this.scrollUp(this.viewportArea.height);
    this.viewportReserved = true;
  }

  private updateCursor(cursor: Point | undefined, cursorWasDisplaced: boolean) {
    if (!cursor) {
      this.hideCursor();
      if (cursorWasDisplaced || this.previousCursor) {
        // Anchor the first live row so a shorter terminal discards the rows
        // below it instead of moving transient content into scrollback.
        this.moveTo(this.viewportArea.x, this.viewportArea.y);
      }
      return;
    }

    this.showCursor();
    if (cursorWasDisplaced || !samePoint(cursor, this.previousCursor)) {
      const x = clamp(Math.floor(cursor.x), 0, this.viewportArea.width - 1);
      const y = clamp(Math.floor(cursor.y), 0, this.viewportArea.height - 1);
      this.moveTo(this.viewportArea.x + x, this.viewportArea.y + y);
    }
  }

  private moveTo(x: number, y: number) {
    this.queue(`\x1B[${y + 1};${x + 1}H`);
    this.cursorRow = y;
  }

  private hideCursor() {
    if (this.cursorHidden) {
      return;
    }
    this.queue(HIDE_CURSOR);
    this.cursorHidden = true;
    this.cancelDeathHandler = onDeath(this.exitHandler);
    process.once('exit', this.exitHandler);
  }

  private showCursor() {
    if (!this.cursorHidden) {
      return;
    }
    this.queue(SHOW_CURSOR);
    this.cursorHidden = false;
    this.cancelDeathHandler?.();
    this.cancelDeathHandler = undefined;
    process.removeListener('exit', this.exitHandler);
  }

  private queue(output: string) {
    this.pendingOutput += output;
  }

  private flushPendingOutput() {
    if (this.pendingOutput.length === 0) {
      return;
    }

    const output = BEGIN_SYNCHRONIZED_UPDATE + this.pendingOutput + END_SYNCHRONIZED_UPDATE;
    this.pendingOutput = '';
    this.stream.write(output);
  }

  private ensureActive() {
    if (this.disposed) {
      throw new Error('InlineRenderer has been disposed');
    }
  }
}

export function createRenderer(options?: InlineRendererOptions) {
  return new InlineRenderer(options);
}

function bufferToPlainText(buffer: CellBuffer) {
  const rows: string[] = [];
  for (let y = 0; y < buffer.height; y += 1) {
    const cells = buffer.row(y);
    let row = '';
    for (let x = 0; x < cells.length; x += 1) {
      if (cells[x].width !== 0) {
        row += cells[x].symbol;
      }
    }
    rows.push(row.trimEnd());
  }
  return rows.join('\n');
}

function samePoint(a?: Point, b?: Point) {
  return a?.x === b?.x && a?.y === b?.y;
}

function clampViewportHeight(height: number, terminalHeight: number) {
  return clamp(Math.floor(height), 1, terminalHeight);
}
