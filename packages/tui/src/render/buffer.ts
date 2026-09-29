import stringWidth from 'fast-string-width';

import { clamp, normalizeNonNegativeInteger } from '../utils/number.ts';

import type { Cell, Rect, Span, Text, TextStyle, WriteOptions, WriteResult } from './types.ts';

import { DEFAULT_STYLE, normalizeStyle, sameStyle } from './style.ts';

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

// Cells are replaced, never mutated, so empty slots share one value.
const EMPTY_CELL: Readonly<Cell> = {
  symbol: ' ',
  width: 1,
  style: DEFAULT_STYLE
};

export class CellBuffer {
  public readonly width: number;

  public readonly height: number;

  private readonly cells: Cell[];

  constructor(width: number, height: number) {
    this.width = normalizeNonNegativeInteger(width);
    this.height = normalizeNonNegativeInteger(height);
    this.cells = Array<Cell>(this.width * this.height).fill(EMPTY_CELL);
  }

  get area(): Rect {
    return { x: 0, y: 0, width: this.width, height: this.height };
  }

  get(x: number, y: number): Readonly<Cell> {
    if (!this.contains(x, y)) {
      return EMPTY_CELL;
    }
    return this.cells[this.index(x, y)];
  }

  set(x: number, y: number, symbol: string, style?: TextStyle) {
    if (!this.contains(x, y)) {
      return;
    }

    symbol = sanitizeSymbol(symbol);
    const width = normalizeSymbolWidth(symbol);
    const cellStyle = normalizeStyle(style);
    this.clearOverlappingSymbol(x, y);
    if (width === 2 && x + 1 >= this.width) {
      this.setCell(x, y, { symbol: '\uFFFD', width: 1, style: cellStyle });
      return;
    }

    this.setCell(x, y, { symbol, width, style: cellStyle });
    if (width === 2) {
      this.clearOverlappingSymbol(x + 1, y);
      this.setCell(x + 1, y, { symbol: '', width: 0, style: cellStyle });
    }
  }

  fill(area: Rect, symbol = ' ', style?: TextStyle) {
    const left = clamp(Math.floor(area.x), 0, this.width);
    const top = clamp(Math.floor(area.y), 0, this.height);
    const right = clamp(Math.floor(area.x + area.width), left, this.width);
    const bottom = clamp(Math.floor(area.y + area.height), top, this.height);
    symbol = sanitizeSymbol(symbol);
    const symbolWidth = normalizeSymbolWidth(symbol);

    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += symbolWidth) {
        this.set(x, y, x + symbolWidth > right ? '\uFFFD' : symbol, style);
      }
    }
  }

  write(text: Text, options: WriteOptions = {}): WriteResult {
    return layoutText(text, this.width, this.height, options, this);
  }

  row(y: number): readonly Readonly<Cell>[] {
    if (y < 0 || y >= this.height) {
      return [];
    }
    const start = y * this.width;
    return this.cells.slice(start, start + this.width);
  }

  private contains(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  private index(x: number, y: number) {
    return y * this.width + x;
  }

  private setCell(x: number, y: number, cell: Cell) {
    this.cells[this.index(x, y)] = cell;
  }

  private clearOverlappingSymbol(x: number, y: number) {
    const cell = this.get(x, y);
    if (cell.width === 0) {
      this.setCell(x - 1, y, EMPTY_CELL);
    } else if (cell.width === 2) {
      this.setCell(x + 1, y, EMPTY_CELL);
    }
  }
}

/** Measure the same layout as write() without allocating or painting cells. */
export function measureText(text: Text, width: number, options: WriteOptions = {}): WriteResult {
  return layoutText(text, normalizeNonNegativeInteger(width), Infinity, options);
}

/** Keep logical line breaks separate from wrapping when committing text. */
export function layoutTextBuffer(text: Text, width: number) {
  const measured = measureText(text, width);
  const buffer = new CellBuffer(width, measured.rows);
  const rows: { end: number; wrapped: boolean }[] = [];
  layoutText(text, buffer.width, buffer.height, {}, buffer, (x, y, wrapped) => {
    rows[y] = { end: x, wrapped };
  });
  return { buffer, rows };
}

interface ChangedRun {
  row: number;
  start: number;
  end: number;
}

export function diffBuffers(previous: CellBuffer, next: CellBuffer) {
  const runs: ChangedRun[] = [];
  let changedCells = 0;

  for (let y = 0; y < next.height; y += 1) {
    const before = previous.row(y);
    const after = next.row(y);
    let x = 0;

    while (x < next.width) {
      if (sameCell(before[x], after[x])) {
        x += 1;
        continue;
      }

      let start = x;
      while (start > 0 && (before[start].width === 0 || after[start].width === 0)) {
        start -= 1;
      }

      let end = x + 1;
      while (end < next.width && !sameCell(before[end], after[end])) {
        end += 1;
      }
      while (end < next.width && (before[end].width === 0 || after[end].width === 0)) {
        end += 1;
      }

      runs.push({ row: y, start, end });
      changedCells += end - start;
      x = end;
    }
  }

  return { runs, changedCells };
}

function layoutText(
  text: Text,
  width: number,
  height: number,
  options: WriteOptions,
  buffer?: CellBuffer,
  onRowEnd?: (x: number, y: number, wrapped: boolean) => void
): WriteResult {
  const startX = clamp(Math.floor(options.x ?? 0), 0, width);
  const startY = clamp(Math.floor(options.y ?? 0), 0, height);
  const maxWidth = clamp(Math.floor(options.width ?? width - startX), 0, width - startX);
  const maxHeight = clamp(Math.floor(options.height ?? height - startY), 0, height - startY);
  const wrap = options.wrap ?? true;
  const tabWidth = Math.max(1, Math.floor(options.tabWidth ?? 8));
  const right = startX + maxWidth;
  const bottom = startY + maxHeight;

  let x = startX;
  let y = startY;
  let rowEnd = startX;
  let touched = false;
  let truncated = false;

  const spans = textToSpans(text);
  const content = spans.map((span) => span.text).join('');

  if (maxWidth === 0 || maxHeight === 0) {
    return { rows: 0, cursor: { x, y }, truncated: content.length > 0 };
  }

  const newline = (wrapped = false) => {
    onRowEnd?.(Math.max(rowEnd, x), y, wrapped);
    touched = true;
    x = startX;
    rowEnd = startX;
    y += 1;
  };

  // A span boundary can split a grapheme (or CRLF). Segment the complete
  // text, using the style of the span where each grapheme starts.
  let spanIndex = 0;
  let spanEnd = spans[0]?.text.length ?? 0;

  for (const segment of graphemeSegmenter.segment(content)) {
    while (segment.index >= spanEnd && spanIndex + 1 < spans.length) {
      spanIndex += 1;
      spanEnd += spans[spanIndex].text.length;
    }
    const grapheme = segment.segment;
    if (grapheme === '\b') {
      // Cancel a pending wrap before moving back one cell. BS never crosses
      // the left margin, and does not erase the text it moves over.
      x = Math.max(startX, Math.min(x, right - 1) - 1);
      touched = true;
      continue;
    }
    if (grapheme === '\r') {
      x = startX;
      touched = true;
      continue;
    }

    if (grapheme === '\n' || grapheme === '\r\n') {
      newline();
      if (y >= bottom) {
        truncated = segment.index + grapheme.length < content.length;
        break;
      }
      continue;
    }

    if (grapheme === '\t') {
      // HT only moves the cursor: it neither erases cells nor wraps past the
      // right margin. A pending wrap from a full row survives the tab.
      if (x < right) {
        const spaces = tabWidth - ((x - startX) % tabWidth);
        x = Math.min(x + spaces, right - 1);
      }
      touched = true;
      continue;
    }

    // Styling is structured data in this renderer. Ignore embedded C0/C1
    // controls so untrusted text cannot inject terminal escape sequences.
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(grapheme)) {
      continue;
    }

    const graphemeWidth = Math.max(0, stringWidth(grapheme));
    if (graphemeWidth === 0) {
      if (buffer) {
        appendCombiningMark(buffer, x, y, grapheme);
      }
      continue;
    }

    const symbol = graphemeWidth > 1 && maxWidth === 1 ? '\uFFFD' : grapheme;
    const cellWidth = symbol === '\uFFFD' ? 1 : graphemeWidth > 1 ? 2 : 1;
    if (x + cellWidth > right) {
      if (!wrap) {
        truncated = true;
        break;
      }
      newline(true);
    }

    if (y >= bottom) {
      truncated = true;
      break;
    }

    buffer?.set(x, y, symbol, spans[spanIndex].style);
    x += cellWidth;
    rowEnd = Math.max(rowEnd, x);
    touched = true;
  }

  // A carriage return can leave painted cells to the right of the cursor.
  // Commit the complete row so overwritten prefixes retain their suffixes.
  if (y < bottom) {
    onRowEnd?.(Math.max(rowEnd, x), y, false);
  }

  return {
    rows: touched ? Math.min(y, bottom - 1) - startY + 1 : 0,
    cursor: { x: Math.min(x, right), y: Math.min(y, bottom - 1) },
    truncated
  };
}

function sameCell(a: Readonly<Cell>, b: Readonly<Cell>) {
  return a.symbol === b.symbol && a.width === b.width && sameStyle(a.style, b.style);
}

function appendCombiningMark(buffer: CellBuffer, x: number, y: number, mark: string) {
  let targetX = x - 1;
  if (targetX < 0) {
    return;
  }
  if (buffer.get(targetX, y).width === 0) {
    targetX -= 1;
  }
  const target = buffer.get(targetX, y);
  if (targetX >= 0 && target.symbol !== ' ') {
    buffer.set(targetX, y, target.symbol + mark, target.style);
  }
}

function normalizeSymbolWidth(symbol: string): 1 | 2 {
  return stringWidth(symbol) > 1 ? 2 : 1;
}

function sanitizeSymbol(input: string) {
  const safe = input.replace(/[\u0000-\u001F\u007F-\u009F]/gu, '');
  return graphemeSegmenter.segment(safe)[Symbol.iterator]().next().value?.segment ?? ' ';
}

function textToSpans(text: Text): readonly Span[] {
  if (typeof text === 'string') {
    return [{ text }];
  }
  return Array.isArray(text) ? text : [text as Span];
}
