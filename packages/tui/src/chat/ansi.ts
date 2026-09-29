import { stripVTControlCharacters } from 'node:util';

import type { Span, TextStyle } from '../render/types.ts';

import { clampInteger } from '../utils/number.ts';

const ANSI_STYLE_PATTERN = /(?:\x1B\[|\x9B)([0-9;:]*)m|\x1B\]8;[^;\x07\x1B]*;([^\x07\x1B]*)(?:\x07|\x1B\\)/g;

const ANSI_COLORS = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'] as const;
const ANSI_BRIGHT_COLORS = [
  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite'
] as const;

/** Convert ANSI-styled chat output into the renderer's structured spans. */
export function ansiToSpans(input: string): Span[] {
  const spans: Span[] = [];
  let style: TextStyle = {};
  let offset = 0;

  for (const match of input.matchAll(ANSI_STYLE_PATTERN)) {
    const index = match.index;
    appendText(spans, input.slice(offset, index), style);
    if (match[1] !== undefined) {
      style = applySgr(style, match[1]);
    } else if (match[2]) {
      style = { ...style, link: match[2] };
    } else {
      const { link: _link, ...rest } = style;
      style = rest;
    }
    offset = index + match[0].length;
  }

  appendText(spans, input.slice(offset), style);

  return spans;
}

function appendText(spans: Span[], input: string, style: TextStyle) {
  const text = stripVTControlCharacters(input);
  if (text.length > 0) {
    spans.push({ text, style });
  }
}

function applySgr(previous: TextStyle, parameters: string): TextStyle {
  let style = { ...previous };
  const groups = parameters.split(';');
  const codes = groups.map(Number);

  for (let i = 0; i < codes.length; i += 1) {
    if (groups[i].includes(':')) {
      applySubparameters(style, groups[i]);
      continue;
    }
    const code = codes[i];
    // SGR resets text attributes; OSC 8 links have their own close sequence.
    if (code === 0) style = style.link ? { link: style.link } : {};
    else if (code === 1) style.bold = true;
    else if (code === 2) style.dim = true;
    else if (code === 3) style.italic = true;
    else if (code === 4) style.underline = true;
    else if (code === 5) style.blink = true;
    else if (code === 7) style.inverse = true;
    else if (code === 8) style.hidden = true;
    else if (code === 9) style.strikethrough = true;
    else if (code === 22) {
      delete style.bold;
      delete style.dim;
    } else if (code === 23) delete style.italic;
    else if (code === 24) delete style.underline;
    else if (code === 25) delete style.blink;
    else if (code === 27) delete style.inverse;
    else if (code === 28) delete style.hidden;
    else if (code === 29) delete style.strikethrough;
    else if (code === 39) delete style.foreground;
    else if (code === 49) delete style.background;
    else if (code >= 30 && code <= 37) style.foreground = ANSI_COLORS[code - 30];
    else if (code >= 90 && code <= 97) style.foreground = ANSI_BRIGHT_COLORS[code - 90];
    else if (code >= 40 && code <= 47) style.background = ANSI_COLORS[code - 40];
    else if (code >= 100 && code <= 107) style.background = ANSI_BRIGHT_COLORS[code - 100];
    else if ((code === 38 || code === 48) && codes[i + 1] === 5 && Number.isFinite(codes[i + 2])) {
      const key = code === 38 ? 'foreground' : 'background';
      style[key] = clampInteger(codes[i + 2], 0, 255);
      i += 2;
    } else if (
      (code === 38 || code === 48) &&
      codes[i + 1] === 2 &&
      [codes[i + 2], codes[i + 3], codes[i + 4]].every(Number.isFinite)
    ) {
      const key = code === 38 ? 'foreground' : 'background';
      style[key] = `#${codes
        .slice(i + 2, i + 5)
        .map((value) => clampInteger(value, 0, 255).toString(16).padStart(2, '0'))
        .join('')}`;
      i += 4;
    }
  }

  return style;
}

/** Colon subparameters belong to one attribute, never independent SGR codes. */
function applySubparameters(style: TextStyle, parameters: string) {
  const parts = parameters.split(':');
  const code = Number(parts[0]);
  const mode = Number(parts[1]);
  if (code === 4 && parts.length === 2) {
    // TextStyle represents all underline variants as a single underline.
    if (mode === 0) delete style.underline;
    else if (mode >= 1 && mode <= 5) style.underline = true;
    return;
  }
  if (code !== 38 && code !== 48) return;

  const key = code === 38 ? 'foreground' : 'background';
  if (mode === 5 && parts.length === 3 && parts[2] !== '' && Number.isFinite(Number(parts[2]))) {
    style[key] = clampInteger(Number(parts[2]), 0, 255);
  } else if (mode === 2) {
    // RGB supports both the compact form and an empty/default color-space slot.
    const offset = parts.length === 5 ? 2 : 3;
    if (parts.length !== 5 && (parts.length !== 6 || (parts[2] !== '' && parts[2] !== '0'))) return;
    const channels = parts.slice(offset);
    if (channels.some((part) => part === '' || !Number.isFinite(Number(part)))) return;
    style[key] =
      `#${channels.map((part) => clampInteger(Number(part), 0, 255).toString(16).padStart(2, '0')).join('')}`;
  }
}
