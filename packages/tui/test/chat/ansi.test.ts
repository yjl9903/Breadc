import { describe, expect, it } from 'vitest';

import { ansiToSpans } from '../../src/chat/ansi.ts';

describe('ANSI utilities', () => {
  it.each(['25', '0'])('resets blinking with SGR %s', (reset) => {
    expect(ansiToSpans(`\x1B[5mblink\x1B[${reset}mplain`)).toEqual([
      { text: 'blink', style: { blink: true } },
      { text: 'plain', style: {} }
    ]);
  });

  it.each(['38:2::255:0:0', '38:2:0:255:0:0', '38:2:255:0:0'])('preserves colon-form RGB colors: %s', (parameters) => {
    expect(ansiToSpans(`\x1B[1;${parameters};48:5:123mred\x1B[0mplain`)).toEqual([
      { text: 'red', style: { bold: true, foreground: '#ff0000', background: 123 } },
      { text: 'plain', style: {} }
    ]);
  });

  it.each(['38:2::255:0', '38:2:1:255:0:0', '38:5:', '99:0'])(
    'consumes unsupported or incomplete subparameters without leaking text or resetting styles: %s',
    (parameters) => {
      expect(ansiToSpans(`\x1B[31m\x1B[${parameters}mtext`)).toEqual([{ text: 'text', style: { foreground: 'red' } }]);
    }
  );

  it('maps underline subparameters without interpreting them as separate attributes', () => {
    expect(ansiToSpans('\x1B[4:3mcurly\x1B[4:0mplain')).toEqual([
      { text: 'curly', style: { underline: true } },
      { text: 'plain', style: {} }
    ]);
  });

  it.each(['\x07', '\x1B\\'])('preserves parameterized OSC 8 links terminated by %j', (terminator) => {
    const link = 'https://example.com';
    expect(ansiToSpans(`\x1B]8;id=build;${link}${terminator}link\x1B]8;id=build;${terminator}plain`)).toEqual([
      { text: 'link', style: { link } },
      { text: 'plain', style: {} }
    ]);
  });

  it.each(['38;2', '38;2;1', '38;2;1;2', '48;2', '48;2;1;2'])(
    'does not replace existing colors with incomplete RGB parameters: %s',
    (parameters) => {
      const [span] = ansiToSpans(`\x1B[31;44m\x1B[${parameters}mtext`);
      expect(span.style).toMatchObject({ foreground: 'red', background: 'blue' });
    }
  );

  it.each(['\x1B[0m', '\x1B[m', '\x9B0m', '\x1B[0;32m'])('keeps OSC 8 links open across SGR reset %j', (reset) => {
    const link = 'https://example.com';
    expect(ansiToSpans(`\x1B]8;;${link}\x1B\\\x1B[1;31mred${reset}linked\x1B]8;;\x1B\\plain`)).toEqual([
      { text: 'red', style: { link, bold: true, foreground: 'red' } },
      { text: 'linked', style: reset === '\x1B[0;32m' ? { link, foreground: 'green' } : { link } },
      { text: 'plain', style: reset === '\x1B[0;32m' ? { foreground: 'green' } : {} }
    ]);
  });

  it('applies SGR parameters sequentially after a reset', () => {
    expect(ansiToSpans('\x1B[1mbold\x1B[0;31mred')).toEqual([
      { text: 'bold', style: { bold: true } },
      { text: 'red', style: { foreground: 'red' } }
    ]);
  });

  it('drops control-only sequences and preserves OSC 8 links as structured styles', () => {
    expect(ansiToSpans('\x1B[31m')).toEqual([]);
    expect(ansiToSpans('\x1B]8;;https://example.com\x07link\x1B]8;;\x07plain')).toEqual([
      { text: 'link', style: { link: 'https://example.com' } },
      { text: 'plain', style: {} }
    ]);
    expect(ansiToSpans('\x1B[2Kdone')).toEqual([{ text: 'done', style: {} }]);
  });

  it('preserves the hidden modifier used by @breadc/color', () => {
    expect(ansiToSpans('\x1B[8msecret\x1B[28mshown')).toEqual([
      { text: 'secret', style: { hidden: true } },
      { text: 'shown', style: {} }
    ]);
  });

  it('maps named, indexed, truecolor, and reset styles', () => {
    expect(ansiToSpans('\x1B[94mbright\x1B[38;5;300mindexed\x1B[48;2;1;2;3mrgb\x1B[39;49mplain')).toEqual([
      { text: 'bright', style: { foreground: 'brightBlue' } },
      { text: 'indexed', style: { foreground: 255 } },
      { text: 'rgb', style: { foreground: 255, background: '#010203' } },
      { text: 'plain', style: {} }
    ]);
  });

  it('supports the 8-bit CSI form', () => {
    expect(ansiToSpans('\x9B31mred\x9B0mplain')).toEqual([
      { text: 'red', style: { foreground: 'red' } },
      { text: 'plain', style: {} }
    ]);
  });
});
