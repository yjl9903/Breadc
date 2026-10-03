import stringWidth from 'fast-string-width';
import type { Example } from '@breadc/core';

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
// SGR and OSC (including hyperlinks) are indivisible, zero-width tokens.
const ansi = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x9b[0-?]*[ -/]*[@-~]/g;

function tokens(text: string): string[] {
  const result: string[] = [];
  let offset = 0;
  for (const match of text.matchAll(ansi)) {
    result.push(...Array.from(graphemes.segment(text.slice(offset, match.index)), (part) => part.segment), match[0]);
    offset = match.index + match[0].length;
  }
  result.push(...Array.from(graphemes.segment(text.slice(offset)), (part) => part.segment));
  return result;
}

/** Wrap prose at words or graphemes, preserving explicit lines and their indentation. */
export function wrap(text: string, width: number): string[] {
  width = Math.max(1, width);
  return text.split(/\r?\n/).flatMap((line) => {
    if (stringWidth(line) <= width) return [line];
    const indent = line.match(/^[ \t]*/)![0];
    const indentWidth = stringWidth(indent);
    // An indentation wider than the terminal is retained on its original line only.
    const continuation = indentWidth < width ? indent : '';
    const parts = tokens(line);
    const rows: string[] = [];
    let start = 0;
    let prefix = '';
    while (start < parts.length) {
      let end = start;
      const prefixWidth = stringWidth(prefix);
      let used = prefixWidth;
      let space = -1;
      while (end < parts.length) {
        const size = stringWidth(parts[end]);
        if (used + size > width && used > prefixWidth) break;
        if (parts[end] === ' ' && used > indentWidth) space = end;
        used += size;
        end++;
      }
      if (end < parts.length && parts[end] === ' ' && used > indentWidth) space = end;
      if (end < parts.length && space > start) {
        rows.push(prefix + parts.slice(start, space).join(''));
        start = space + 1;
      } else {
        rows.push(prefix + parts.slice(start, end).join(''));
        start = end;
      }
      prefix = continuation;
    }
    return rows;
  });
}

/** Shell commands remain literal; only explanatory comments are wrapped. */
export function formatExamples(examples: readonly Example[], width: number): string[] {
  return examples.flatMap((example, index) => [
    ...(index ? [''] : []),
    ...(example.comment === undefined ? [] : wrap(example.comment, width - 2).map((line) => `# ${line}`)),
    ...example.command.split(/\r?\n/)
  ]);
}

/** One description column for the entire list; narrow lists stack all entries. */
export function list(rows: Array<[string, string]>, width: number): string[] {
  const labelWidth = Math.max(0, ...rows.map(([label]) => stringWidth(label)));
  const column = 2 + labelWidth + 2;
  const stacked = width - column < 20;
  const contentWidth = width - (stacked ? 4 : column);
  const output: string[] = [];
  for (let index = 0; index < rows.length; index++) {
    const [label, description] = rows[index];
    const lines = wrap(description, contentWidth);
    const hasContent = lines.some(Boolean);
    if (stacked) {
      if (index) output.push('');
      output.push(...wrap(label.trimStart(), width - 2).map((line) => `  ${line}`));
      if (hasContent) output.push(...lines.map((line) => (line ? `    ${line}` : '')));
    } else {
      output.push(`  ${label}` + (hasContent ? ' '.repeat(column - 2 - stringWidth(label)) + lines[0] : ''));
      output.push(...lines.slice(1).map((line) => (line ? ' '.repeat(column) + line : '')));
      if (lines.length > 1 && index < rows.length - 1) output.push('');
    }
  }
  return output;
}
