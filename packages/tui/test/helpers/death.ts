import { expect, vi } from 'vitest';

/** Mock only process-signal registration, retaining registration and cancellation semantics. */
const death = vi.hoisted(() => {
  const callbacks = new Set<() => void>();
  return {
    callbacks,
    emit() {
      for (const callback of [...callbacks]) callback();
    }
  };
});

vi.mock('@breadc/death', () => ({
  onDeath(callback: () => void) {
    death.callbacks.add(callback);
    return () => death.callbacks.delete(callback);
  }
}));

// Tests must dispose their owners. Reset only after checking, so leaks cannot be hidden.
export function assertDeathHandlersReleased() {
  try {
    expect(death.callbacks.size).toBe(0);
  } finally {
    death.callbacks.clear();
  }
}

export { death };
