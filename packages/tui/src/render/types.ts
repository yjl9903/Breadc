export interface OutputStream {
  write(chunk: string): boolean;

  isTTY?: boolean;

  columns?: number;

  rows?: number;
}

export interface Size {
  width: number;

  height: number;
}

export interface Point {
  x: number;

  y: number;
}

export interface Rect extends Point, Size {}

export type NamedColor =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'brightBlack'
  | 'brightRed'
  | 'brightGreen'
  | 'brightYellow'
  | 'brightBlue'
  | 'brightMagenta'
  | 'brightCyan'
  | 'brightWhite';

export type Color = NamedColor | number | `#${string}`;

export interface TextStyle {
  foreground?: Color;

  background?: Color;

  bold?: boolean;

  dim?: boolean;

  italic?: boolean;

  underline?: boolean;

  blink?: boolean;

  inverse?: boolean;

  hidden?: boolean;

  strikethrough?: boolean;

  /** OSC 8 hyperlink target. */
  link?: string;
}

export interface Cell {
  symbol: string;

  width: 0 | 1 | 2;

  style: Readonly<TextStyle>;
}

export interface Span {
  text: string;

  style?: TextStyle;
}

export type Text = string | Span | readonly Span[];

export interface WriteOptions extends Partial<Point> {
  width?: number;

  height?: number;

  wrap?: boolean;

  /** Tab stop spacing in cells. Defaults to the terminal convention of 8. */
  tabWidth?: number;
}

export interface WriteResult {
  rows: number;

  cursor: Point;

  truncated: boolean;
}

export interface HitRegion<T = unknown> {
  id: string;

  area: Rect;

  data?: T;
}

export interface RenderResult {
  changedCells: number;

  area: Rect;

  cursor?: Point;

  regions: readonly HitRegion[];
}

export type DrawCallback = (frame: import('./frame.ts').Frame) => void;

export interface InlineRendererOptions {
  stream?: OutputStream;

  isTTY?: boolean;

  columns?: number;

  rows?: number;

  viewportHeight?: number;

  /** Override process-exit cleanup ownership for a higher-level controller. */
  onExit?: () => void;
}
