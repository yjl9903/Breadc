import type { HitRegion, Point, Rect, Text, TextStyle, WriteOptions, WriteResult } from './types.ts';

import { CellBuffer } from './buffer.ts';

export class Frame {
  public readonly buffer: CellBuffer;

  public readonly area: Rect;

  public cursor: Point | undefined;

  public readonly regions: HitRegion[] = [];

  constructor(buffer: CellBuffer) {
    this.buffer = buffer;
    this.area = buffer.area;
  }

  write(text: Text, options?: WriteOptions): WriteResult {
    return this.buffer.write(text, options);
  }

  fill(area: Rect, symbol = ' ', style?: TextStyle) {
    this.buffer.fill(area, symbol, style);
  }

  /**
   * Place the real terminal cursor relative to the viewport; omit to hide it.
   * On terminal shrink, live rows above a visible cursor can enter native
   * scrollback before resize() runs and cannot be selectively removed.
   */
  setCursor(cursor?: Point) {
    this.cursor = cursor ? { ...cursor } : undefined;
  }

  addRegion<T>(id: string, area: Rect, data?: T) {
    const region: HitRegion<T> = {
      id,
      area: { ...area },
      ...(data === undefined ? {} : { data })
    };
    this.regions.push(region);
    return region;
  }
}
