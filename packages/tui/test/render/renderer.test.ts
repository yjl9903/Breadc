import { assertDeathHandlersReleased } from '../helpers/death.ts';

import { afterEach, describe, expect, it } from 'vitest';

import { MemoryStream } from '../helpers/stream.ts';
import { InlineRenderer } from '../../src/render/renderer.ts';

const renderers: InlineRenderer[] = [];

afterEach(() => {
  for (const renderer of renderers.splice(0)) renderer.dispose();
  assertDeathHandlersReleased();
});

function setup(isTTY = true, columns = 20, rows = 8) {
  const stream = new MemoryStream(isTTY, columns, rows);
  const renderer = new InlineRenderer({ stream, viewportHeight: 2 });
  renderers.push(renderer);
  return { renderer, stream };
}

describe('renderer output protocol', () => {
  it('writes a frame in one synchronized update', () => {
    const { renderer, stream } = setup();
    renderer.render((frame) => frame.write('hello'));
    expect(stream.chunks).toHaveLength(1);
    expect(stream.output().startsWith('\x1B[?2026h')).toBe(true);
    expect(stream.output().endsWith('\x1B[?2026l')).toBe(true);
  });

  it('batches a commit and redraw into one synchronized write', () => {
    const { renderer, stream } = setup();
    renderer.render((frame) => frame.write('working'));
    stream.reset();
    renderer.batch(() => {
      renderer.commit('done');
      renderer.render((frame) => frame.write('next'));
    });
    expect(stream.chunks).toHaveLength(1);
    expect(stream.output().split('\x1B[?2026h')).toHaveLength(2);
    expect(stream.output().split('\x1B[?2026l')).toHaveLength(2);
    expect(stream.output().startsWith('\x1B[?2026h')).toBe(true);
    expect(stream.output().endsWith('\x1B[?2026l')).toBe(true);
  });

  it('does not write unchanged frames', () => {
    const { renderer, stream } = setup();
    renderer.render((frame) => frame.write('same'));
    stream.reset();
    expect(renderer.render((frame) => frame.write('same')).changedCells).toBe(0);
    expect(stream.output()).toBe('');
  });

  // OSC 8 link targets are not exposed by xterm's public buffer API.
  it('closes hyperlinks before subsequent plain text and before returning control', () => {
    const { renderer, stream } = setup();
    renderer.render((frame) =>
      frame.write([
        { text: 'link', style: { link: 'https://example.com' } },
        { text: 'plain' },
        { text: 'last', style: { link: 'https://example.org' } }
      ])
    );
    expect(stream.output()).toContain('\x1B]8;;https://example.com\x1B\\link\x1B]8;;\x1B\\\x1B[0mplain');
    expect(stream.output()).toContain('\x1B]8;;https://example.org\x1B\\last\x1B]8;;\x1B\\');
  });
});

describe('renderer pipe output', () => {
  it('prints every wrapped row of a long commit', () => {
    const { renderer, stream } = setup(false, 120, 24);
    const text = 'x'.repeat(9997) + 'end';
    renderer.commit(text);
    expect(stream.output()).toBe(text.match(/.{1,120}/g)!.join('\n') + '\n');
  });

  it('prints committed content but skips transient frames', () => {
    const { renderer, stream } = setup(false);
    renderer.render((frame) => frame.write('transient'));
    renderer.commit('stable');
    expect(stream.output()).toBe('stable\n');
  });
});
