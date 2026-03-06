import { stringWidth } from './string-width.ts';

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

// 兼容常见 ANSI 控制序列：
// - CSI: ESC [ ... cmd
// - OSC: ESC ] ... BEL / ST(ESC \\)
// - ESC 单字符序列
const ANSI_ESCAPE_REGEX = /\u001B(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007\u001B]*(?:\u0007|\u001B\\)|[@-Z\\-_])/g;

interface Token {
  value: string;
  ansi: boolean;
}

/**
 * 将一组逻辑行按给定列宽切分为渲染行。
 *
 * - 按 grapheme cluster 切分，避免破坏 emoji / 组合字符。
 * - ANSI 序列视为零宽，并保持原样拼接。
 */
export function wrapLinesByWidth(lines: string[], columns: number): string[] {
  const wrapped: string[] = [];

  for (const line of lines) {
    wrapped.push(...wrapLineByWidth(line, columns));
  }

  return wrapped;
}

/**
 * 将单条逻辑行按给定列宽切分为渲染行。
 */
export function wrapLineByWidth(line: string, columns: number): string[] {
  const safeColumns = Math.max(1, Math.floor(columns));
  if (line.length === 0) {
    return [''];
  }

  const tokens = tokenizeAnsi(line);
  const rows: string[] = [];
  let current = '';
  let currentWidth = 0;

  for (const token of tokens) {
    if (token.ansi) {
      current += token.value;
      continue;
    }

    for (const segment of graphemeSegmenter.segment(token.value)) {
      const grapheme = segment.segment;
      const graphemeWidth = stringWidth(grapheme);

      if (graphemeWidth === 0) {
        current += grapheme;
        continue;
      }

      if (currentWidth > 0 && currentWidth + graphemeWidth > safeColumns) {
        // TODO(review P2): 当带 ANSI 样式的内容在这里发生换行时，下一行未继承当前激活样式。
        // 例如 "\u001b[31mabcde\u001b[39m" 在宽度 3 下，续行会变成 "de\u001b[39m"，
        // 在按行差量刷新 TTY 时可能被渲染成无样式文本，导致颜色丢失。
        rows.push(current);
        current = '';
        currentWidth = 0;
      }

      current += grapheme;
      currentWidth += graphemeWidth;

      if (currentWidth >= safeColumns) {
        rows.push(current);
        current = '';
        currentWidth = 0;
      }
    }
  }

  if (rows.length === 0 || current.length > 0) {
    // TODO(review P2): 当前逻辑在“可见字符刚好填满列宽”且末尾只有零宽 ANSI 序列时，
    // 可能把纯 ANSI 内容作为独立物理行写入 rows（例如 ['\u001b[31mab', '\u001b[39m']），
    // 这会让 Frame.rows 行数虚增，影响光标移动/清屏，并可能引入空白行伪影。
    rows.push(current);
  }

  return rows;
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
