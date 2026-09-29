import { clamp } from '../utils/number.ts';

import type { AnyState } from './types.ts';
import type { ProgressBarRenderOptions, RenderContext, WidgetTemplate } from './widget.ts';

export function renderProgressBar(value: number, total: number, barOptions: ProgressBarRenderOptions) {
  const { width, complete, incomplete } = barOptions;
  const ratio = progressRatio(value, total);
  const completeCount = Math.round(ratio * width);
  return complete.repeat(completeCount) + incomplete.repeat(width - completeCount);
}

export function renderPercent(value: number, total: number) {
  return Math.floor(progressRatio(value, total) * 100);
}

function progressRatio(value: number, total: number) {
  const parsedValue = Number(value);
  const parsedTotal = Number(total);
  if (!Number.isFinite(parsedValue) || !Number.isFinite(parsedTotal) || parsedTotal <= 0) return 0;
  return clamp(parsedValue / parsedTotal, 0, 1);
}

export function renderTemplateLines<S extends AnyState>(
  template: WidgetTemplate<S>,
  context: RenderContext<S>,
  resolvedValues: Record<string, unknown>
): string[] {
  const rawTemplate = typeof template === 'function' ? template(context) : template;
  const templateLines = Array.isArray(rawTemplate) ? rawTemplate : [rawTemplate];

  const lines: string[] = [];
  for (const line of templateLines) {
    const text = line.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
      const value = resolvedValues[key];
      return stringifyValue(value);
    });

    for (const chunk of text.split(/\r?\n/g)) {
      lines.push(chunk);
    }
  }

  return lines;
}

export function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
