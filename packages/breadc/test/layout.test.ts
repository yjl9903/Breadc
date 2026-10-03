import { describe, expect, it } from 'vitest';
import { formatExamples, list, wrap } from '../src/builtin/layout.ts';

// Tiny widths isolate boundary behavior without large help-page fixtures.
describe('help layout: wrapping', () => {
  it.each([
    ['exact fit', 'abcde', 5, ['abcde']],
    ['boundary space', 'abcde next', 5, ['abcde', 'next']],
    ['word boundary', 'abc defgh', 7, ['abc', 'defgh']],
    ['long word', 'abcdefghijk', 5, ['abcde', 'fghij', 'k']],
    ['wide graphemes', '你👩🏽‍💻e\u0301好', 5, ['你👩🏽‍💻e\u0301', '好']],
    ['wide grapheme at minimum width', '你a', 1, ['你', 'a']]
  ] as const)('wraps %s', (_name, input, width, expected) => {
    expect(wrap(input, width)).toEqual(expected);
  });

  it('preserves CRLF paragraphs, explicit indentation and trailing empty lines', () => {
    expect(wrap('  one two three four\r\n\r\n    next line\r\n', 12)).toMatchInlineSnapshot(`
      [
        "  one two",
        "  three four",
        "",
        "    next",
        "    line",
        "",
      ]
    `);
    expect(wrap('      abcdef', 4)).toMatchInlineSnapshot(`
      [
        "    ",
        "  ab",
        "cdef",
      ]
    `);
  });

  it('preserves ANSI styles and both OSC hyperlink terminators across wrapped graphemes', () => {
    const input = '\x1b[31m你好👩🏽‍💻e\u0301世界\x1b[0m';
    expect(wrap(input, 4)).toEqual(['\x1b[31m你好', '👩🏽‍💻e\u0301', '世界\x1b[0m']);
    for (const terminator of ['\x07', '\x1b\\']) {
      const linked = `\x1b]8;;https://example.com${terminator}你好世界\x1b]8;;${terminator}`;
      expect(wrap(linked, 4).join('')).toBe(linked);
    }
  });
});

describe('help layout: lists', () => {
  it('keeps columns at 20 available cells and stacks every row at 19', () => {
    const rows: Array<[string, string]> = [
      ['--file <path>', 'Input file\nA relative path.'],
      ['-f', 'Overwrite files']
    ];
    expect(list(rows, 37).join('\n')).toMatchInlineSnapshot(`
      "  --file <path>  Input file
                       A relative path.

        -f             Overwrite files"
    `);
    expect(list(rows, 36).join('\n')).toMatchInlineSnapshot(`
      "  --file <path>
          Input file
          A relative path.

        -f
          Overwrite files"
    `);
  });

  it('wraps stacked labels and aligns paragraphs while retaining undocumented entries', () => {
    expect(
      list(
        [
          ['--very-long-unbroken-option-name <file>', 'Summary\n\n  indented details that continue'],
          ['--silent', ''],
          ['-v', 'Last entry']
        ],
        24
      ).join('\n')
    ).toMatchInlineSnapshot(`
      "  --very-long-unbroken-o
        ption-name <file>
          Summary

            indented details
            that continue

        --silent

        -v
          Last entry"
    `);
  });

  it('uses visible label widths for ANSI, CJK and combining marks', () => {
    expect(
      list(
        [
          ['\x1b[31m中文\x1b[0m', 'First\nContinued'],
          ['e\u0301👩🏽‍💻', 'Second'],
          ['none', '']
        ],
        40
      )
    ).toEqual(['  \x1b[31m中文\x1b[0m  First', '        Continued', '', '  e\u0301👩🏽‍💻   Second', '  none']);
  });
});

describe('help layout: examples', () => {
  it('wraps every comment line while preserving literal commands and empty comments', () => {
    expect(
      formatExamples(
        [
          {
            comment: 'Explain this command using several words.\r\n  保留中文缩进与换行。',
            command: 'cli run --very-long-argument=unchanged \\\r\n    --next value\r\n'
          },
          { comment: '', command: 'cli empty-comment' },
          { command: 'cli uncommented' }
        ],
        22
      ).join('\n')
    ).toMatchInlineSnapshot(`
      "# Explain this command
      # using several words.
      #   保留中文缩进与换行
      #   。
      cli run --very-long-argument=unchanged \\
          --next value


      # 
      cli empty-comment

      cli uncommented"
    `);
  });
});
