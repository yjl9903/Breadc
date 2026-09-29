import { clampInteger } from '../utils/number.ts';

import type { Cell, Color, NamedColor, TextStyle } from './types.ts';

const CLOSE_LINK = '\x1B]8;;\x1B\\';
const RESET_STYLE = '\x1B[0m';

const FOREGROUND_CODES: Record<NamedColor, number> = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  brightBlack: 90,
  brightRed: 91,
  brightGreen: 92,
  brightYellow: 93,
  brightBlue: 94,
  brightMagenta: 95,
  brightCyan: 96,
  brightWhite: 97
};

export const DEFAULT_STYLE: Readonly<TextStyle> = Object.freeze({});

export function sameStyle(a: Readonly<TextStyle>, b: Readonly<TextStyle>) {
  return (
    a.foreground === b.foreground &&
    a.background === b.background &&
    a.bold === b.bold &&
    a.dim === b.dim &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.blink === b.blink &&
    a.inverse === b.inverse &&
    a.hidden === b.hidden &&
    a.strikethrough === b.strikethrough &&
    a.link === b.link
  );
}

export function normalizeStyle(style?: TextStyle): Readonly<TextStyle> {
  return style ? Object.freeze({ ...style }) : DEFAULT_STYLE;
}

export function renderCells(cells: readonly Readonly<Cell>[], start: number, end: number) {
  let output = RESET_STYLE;
  let activeStyle = DEFAULT_STYLE;

  for (let x = start; x < end; x += 1) {
    const cell = cells[x];
    if (cell.width === 0) {
      continue;
    }
    if (!sameStyle(activeStyle, cell.style)) {
      if (activeStyle.link) {
        output += CLOSE_LINK;
      }
      output += RESET_STYLE + styleToAnsi(cell.style);
      activeStyle = cell.style;
    }
    output += cell.symbol;
  }

  return output + (activeStyle.link ? CLOSE_LINK : '') + RESET_STYLE;
}

export function contentEnd(cells: readonly Readonly<Cell>[]) {
  let end = cells.length;
  while (
    end > 0 &&
    cells[end - 1].symbol === ' ' &&
    cells[end - 1].width === 1 &&
    sameStyle(cells[end - 1].style, DEFAULT_STYLE)
  ) {
    end -= 1;
  }
  return end;
}

function styleToAnsi(style: Readonly<TextStyle>) {
  const codes: number[] = [];

  if (style.bold) codes.push(1);
  if (style.dim) codes.push(2);
  if (style.italic) codes.push(3);
  if (style.underline) codes.push(4);
  if (style.blink) codes.push(5);
  if (style.inverse) codes.push(7);
  if (style.hidden) codes.push(8);
  if (style.strikethrough) codes.push(9);

  pushColor(codes, style.foreground, false);
  pushColor(codes, style.background, true);

  const sgr = codes.length > 0 ? `\x1B[${codes.join(';')}m` : '';
  const link = style.link ? `\x1B]8;;${sanitizeLink(style.link)}\x1B\\` : '';
  return sgr + link;
}

function sanitizeLink(link: string) {
  return link.replace(/[\u0000-\u001F\u007F-\u009F]/gu, '');
}

function pushColor(codes: number[], color: Color | undefined, background: boolean) {
  if (color === undefined) {
    return;
  }

  if (typeof color === 'number') {
    codes.push(background ? 48 : 38, 5, clampInteger(color, 0, 255));
    return;
  }

  if (color.startsWith('#')) {
    const rgb = parseHex(color);
    if (rgb) {
      codes.push(background ? 48 : 38, 2, ...rgb);
    }
    return;
  }

  const foreground = FOREGROUND_CODES[color as NamedColor];
  codes.push(background ? foreground + 10 : foreground);
}

function parseHex(input: string): [number, number, number] | undefined {
  const value = input.slice(1);
  if (/^[\da-f]{3}$/i.test(value)) {
    return value.split('').map((part) => Number.parseInt(part + part, 16)) as [number, number, number];
  }
  if (/^[\da-f]{6}$/i.test(value)) {
    return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as [number, number, number];
  }
  return undefined;
}
