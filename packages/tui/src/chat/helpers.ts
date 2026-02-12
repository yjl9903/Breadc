import type { AnyState } from './types.ts';
import type { ProgressBarRenderOptions, RenderContext, WidgetTemplate } from './widget.ts';

export function renderProgressBar(value: number, total: number, barOptions: ProgressBarRenderOptions) {
  const width = Math.max(1, barOptions.width);
  const complete = barOptions.complete ?? '=';
  const incomplete = barOptions.incomplete ?? '-';
  const ratio = total > 0 ? clamp(value / total, 0, 1) : 0;
  const completeCount = Math.round(ratio * width);
  return complete.repeat(completeCount) + incomplete.repeat(width - completeCount);
}

export function renderPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.floor(clamp((value / total) * 100, 0, 100));
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

export function numericOrDefault(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeProgressValue(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return clamp(value, 0, total);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
