import { describe, expect, it } from 'vitest';

import { renderPercent, renderProgressBar, renderTemplateLines } from '../../src/chat/helpers.ts';

describe('progress formatting', () => {
  it.each([
    { value: -1, total: 10, bar: '----------', percent: 0 },
    { value: 3, total: 10, bar: '===-------', percent: 30 },
    { value: 1, total: 3, bar: '===-------', percent: 33 },
    { value: 11, total: 10, bar: '==========', percent: 100 },
    { value: 3, total: 0, bar: '----------', percent: 0 }
  ])('formats $value of $total', ({ value, total, bar, percent }) => {
    expect(renderProgressBar(value, total, { width: 10, complete: '=', incomplete: '-' })).toBe(bar);
    expect(renderPercent(value, total)).toBe(percent);
  });
});

describe('widget template formatting', () => {
  it('resolves fields and preserves empty lines and missing values', () => {
    const context = { tick: 2, state: { name: 'build' }, fields: {} };
    expect(
      renderTemplateLines(['{name}: {percent}%', '', '{missing}\r\n{value}'], context, {
        name: 'build',
        percent: 50,
        value: 2
      })
    ).toEqual(['build: 50%', '', '', '2']);
  });

  it('evaluates function templates with the current state and tick', () => {
    const context = { tick: 3, state: { name: 'build' }, fields: {} };
    expect(renderTemplateLines((ctx) => `${ctx.state.name} {tick}`, context, { tick: 3 })).toEqual(['build 3']);
  });
});
