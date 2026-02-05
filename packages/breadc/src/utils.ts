export function camelCase(text: string): string {
  return text
    .split('-')
    .map((t, idx) => (idx === 0 ? t : t[0].toUpperCase() + t.slice(1)))
    .join('');
}

export function twoColumn(texts: Array<[string, string]>, split = '  ') {
  const left = padRight(texts.map((t) => t[0]));
  return left.map((l, idx) => l + split + texts[idx][1]);
}

export function padRight(texts: string[], fill = ' '): string[] {
  const length = texts.map((t) => t.length).reduce((max, l) => Math.max(max, l), 0);
  return texts.map((t) => t + fill.repeat(length - t.length));
  /* c8 ignore next 1 */
}
