export function stripPrefix(text: string, prefix: string): string | undefined {
  if (text.startsWith(prefix)) {
    return text.slice(prefix.length);
  } else {
    return undefined;
  }
}

export function splitOnce(
  text: string,
  separator: string
): [string, string | undefined] {
  const found = text.indexOf(separator);
  if (found === -1) {
    return [text, undefined];
  }

  const first = text.slice(0, found);
  const second = text.slice(found + separator.length);
  return [first, second];
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it('stripPrefix', () => {
    expect(stripPrefix('abc', 'a')).toMatchInlineSnapshot(`"bc"`);
    expect(stripPrefix('abc', 'd')).toMatchInlineSnapshot(`undefined`);
  });

  it('splitOnce', () => {
    expect(splitOnce('a=bc', '=')).toMatchInlineSnapshot(`
      [
        "a",
        "bc",
      ]
    `);
    expect(splitOnce('a=bc', ',')).toMatchInlineSnapshot(`
      [
        "a=bc",
        undefined,
      ]
    `);
  });
}
