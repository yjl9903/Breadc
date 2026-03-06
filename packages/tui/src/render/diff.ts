import { stringWidth } from './string-width.ts';

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

// 兼容常见 ANSI 控制序列：
// - CSI: ESC [ ... cmd
// - OSC: ESC ] ... BEL / ST(ESC \\)
// - ESC 单字符序列
const ANSI_ESCAPE_REGEX = /\u001B(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007\u001B]*(?:\u0007|\u001B\\)|[@-Z\\-_])/g;

export interface RowPatch {
  rowIndex: number;
  startColumn: number;
  deleteColumns: number;
  insertText: string;
}

export type RowsPatch =
  | {
      kind: 'noop';
    }
  | {
      kind: 'reflow';
      prefixRowCount: number;
      nextRows: string[];
    }
  | {
      kind: 'row-diff';
      rowPatches: RowPatch[];
      nextRows: string[];
    };

interface Token {
  value: string;
  ansi: boolean;
}

interface DisplayUnit {
  text: string;
  width: number;
}

/**
 * 对两组物理行做 diff，返回用于 TTY 局部更新的补丁。
 */
export function diffRows(previousRows: string[], nextRows: string[]): RowsPatch {
  if (sameRows(previousRows, nextRows)) {
    return { kind: 'noop' };
  }

  if (previousRows.length !== nextRows.length) {
    return {
      kind: 'reflow',
      prefixRowCount: commonPrefixRows(previousRows, nextRows),
      nextRows
    };
  }

  const rowPatches: RowPatch[] = [];
  for (let i = 0; i < previousRows.length; i += 1) {
    const patch = diffRow(previousRows[i], nextRows[i], i);
    if (patch) {
      rowPatches.push(patch);
    }
  }

  if (rowPatches.length === 0) {
    return { kind: 'noop' };
  }

  return {
    kind: 'row-diff',
    rowPatches,
    nextRows
  };
}

function sameRows(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

function commonPrefixRows(a: string[], b: string[]) {
  const length = Math.min(a.length, b.length);
  let count = 0;
  while (count < length && a[count] === b[count]) {
    count += 1;
  }
  return count;
}

function diffRow(previous: string, next: string, rowIndex: number): RowPatch | undefined {
  if (previous === next) {
    return undefined;
  }

  const previousUnits = tokenizeDisplayUnits(previous);
  const nextUnits = tokenizeDisplayUnits(next);
  const prefixUnitCount = commonPrefixUnits(previousUnits, nextUnits);

  const startColumn = widthOfUnits(previousUnits.slice(0, prefixUnitCount));
  const deleteColumns = widthOfUnits(previousUnits.slice(prefixUnitCount));
  const insertText = textOfUnits(nextUnits.slice(prefixUnitCount));

  return {
    rowIndex,
    startColumn,
    deleteColumns,
    insertText
  };
}

function commonPrefixUnits(a: DisplayUnit[], b: DisplayUnit[]) {
  const length = Math.min(a.length, b.length);
  let count = 0;
  while (count < length && a[count].text === b[count].text) {
    count += 1;
  }
  return count;
}

function widthOfUnits(units: DisplayUnit[]) {
  let width = 0;
  for (const unit of units) {
    width += unit.width;
  }
  return width;
}

function textOfUnits(units: DisplayUnit[]) {
  let text = '';
  for (const unit of units) {
    text += unit.text;
  }
  return text;
}

function tokenizeDisplayUnits(input: string): DisplayUnit[] {
  const tokens = tokenizeAnsi(input);
  const units: DisplayUnit[] = [];
  let pending = '';

  for (const token of tokens) {
    if (token.ansi) {
      pending += token.value;
      continue;
    }

    for (const segment of graphemeSegmenter.segment(token.value)) {
      const grapheme = segment.segment;
      const width = stringWidth(grapheme);
      if (width === 0) {
        pending += grapheme;
        continue;
      }

      units.push({
        text: pending + grapheme,
        width
      });
      pending = '';
    }
  }

  if (pending.length > 0) {
    units.push({ text: pending, width: 0 });
  }

  return units;
}

function tokenizeAnsi(input: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;

  for (const match of input.matchAll(ANSI_ESCAPE_REGEX)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ value: input.slice(lastIndex, index), ansi: false });
    }

    tokens.push({ value: match[0], ansi: true });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < input.length) {
    tokens.push({ value: input.slice(lastIndex), ansi: false });
  }

  if (tokens.length === 0) {
    tokens.push({ value: input, ansi: false });
  }

  return tokens;
}
