/**
 * Per-key circuit breaker. Opens after N consecutive failures, half-opens
 * after a cooldown; a single success closes it again.
 */

export type CircuitState = "closed" | "open" | "half-open";

export interface Circuit {
  state: CircuitState;
  failures: number;
  openedAt: number | null;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
}

const FAIL_THRESHOLD = 5;
const COOLDOWN_MS = 60_000;

const breakers = new Map<string, Circuit>();

function get(key: string): Circuit {
  let c = breakers.get(key);
  if (!c) {
    c = {
      state: "closed",
      failures: 0,
      openedAt: null,
      lastFailureAt: null,
      lastSuccessAt: null,
    };
    breakers.set(key, c);
  }
  return c;
}

export function shouldAllow(key: string, now = Date.now()): boolean {
  const c = get(key);
  if (c.state === "open") {
    if (c.openedAt !== null && now - c.openedAt > COOLDOWN_MS) {
      c.state = "half-open";
      return true;
    }
    return false;
  }
  return true;
}

export function recordSuccess(key: string, now = Date.now()): void {
  const c = get(key);
  c.state = "closed";
  c.failures = 0;
  c.openedAt = null;
  c.lastSuccessAt = now;
}

export function recordFailure(key: string, now = Date.now()): void {
  const c = get(key);
  c.failures += 1;
  c.lastFailureAt = now;
  if (c.failures >= FAIL_THRESHOLD) {
    c.state = "open";
    c.openedAt = now;
  }
}

export function snapshot(): Record<string, Circuit> {
  const out: Record<string, Circuit> = {};
  for (const [k, v] of breakers.entries()) out[k] = { ...v };
  return out;
}
