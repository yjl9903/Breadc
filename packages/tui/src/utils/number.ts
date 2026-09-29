export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function clampInteger(value: number, min: number, max: number) {
  return clamp(Math.floor(value), min, max);
}

export function normalizeNonNegativeInteger(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

export function normalizePositiveInteger(value: number | undefined, fallback: number) {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.max(1, Math.floor(value));
}
