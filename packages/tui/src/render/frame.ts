import { wrapLinesByWidth } from './wrap.ts';
import { type RowsPatch, diffRows } from './diff.ts';

const DEFAULT_COLUMNS = 80;

/**
 * Frame 表示一次完整的渲染结果。
 *
 * - lines: 逻辑行（模板展开后的原始行）
 * - rows: 物理行（逻辑行按终端宽度切分后的渲染行）
 */
export class Frame {
  public readonly columns: number;

  public readonly lines: string[];

  public readonly rows: string[];

  private constructor(lines: string[], rows: string[], columns: number) {
    this.lines = lines;
    this.rows = rows;
    this.columns = columns;
  }

  /**
   * 根据逻辑行和终端列宽创建 Frame。
   *
   * 这里会主动按列宽切分逻辑行，避免依赖终端自动折行。
   * 切分时按 grapheme cluster 处理，避免把字符（如 emoji / 组合字符）切坏。
   */
  static from(lines: string[], inputColumns?: number, prevFrame?: Frame): Frame {
    const columns = normalizeColumns(inputColumns);

    if (lines.length === 0) {
      return new Frame([], [], columns);
    }

    if (prevFrame) {
      // Re-use prev frame result
      if (
        lines.length === prevFrame.lines.length &&
        columns === prevFrame.columns &&
        lines.every((line, index) => line === prevFrame.lines[index])
      ) {
        return new Frame([...lines], [...prevFrame.rows], columns);
      }
    }

    const rows = wrapLinesByWidth(lines, columns);

    return new Frame([...lines], rows, columns);
  }

  diff(next: Frame): RowsPatch {
    const patch = diffRows(this.rows, next.rows);
    return patch;
  }

  /**
   * 比较逻辑行和物理行是否一致，用于判断是否可以跳过重绘。
   */
  equals(other: Frame): boolean {
    if (this.rows.length !== other.rows.length) {
      return false;
    }

    if (this.lines.length !== other.lines.length) {
      return false;
    }

    for (let i = 0; i < this.lines.length; i += 1) {
      if (this.lines[i] !== other.lines[i]) {
        return false;
      }
    }

    for (let i = 0; i < this.rows.length; i += 1) {
      if (this.rows[i] !== other.rows[i]) {
        return false;
      }
    }

    return true;
  }
}

function normalizeColumns(columns?: number): number {
  if (!Number.isFinite(columns)) {
    return DEFAULT_COLUMNS;
  }

  return Math.max(1, Math.floor(Number(columns)));
}
