/**
 * MockSource — simulates a live visibility feed with realistic jitter.
 *
 * Behaviour (per brief §5 Phase 3):
 *   - observed drifts ±0.2% per tick normally
 *   - occasional 1-3% drops that auto-recover over a few ticks
 *   - lastSync always advances (otherwise the tile ages into stale_data)
 *   - rare events: a tool drops or gains a cause flag → fires a toast
 *   - rare events: tower alert pulse (handled by the provider, not here)
 *
 * Seeded by tool.id so reloads produce the same opening state.
 */

import type { Tool, ToolSeed, VisibilityCauseFlag } from "@/types/tool";
import { CAUSES } from "@/lib/visibility/causes";
import type { VisibilitySource, VisibilityUpdate } from "./VisibilitySource";

interface Recoverable {
  toolId: string;
  targetFraction: number;
  /** ticks remaining until recovery */
  recoverIn: number;
}

// Tuned way down post-feedback: with 12 tools at a 5-15s tick, the previous
// rates produced ~10 events/min, which turned the inbox into wallpaper.
// New rates settle around ~1.5 events/min — visible motion, not noise.
const RARE_CAUSE_FLIP = 0.01; // 1% per tool per tick
const RARE_DROP = 0.005; // 0.5% per tool per tick

export class MockSource implements VisibilitySource {
  name = "mock-feeder";
  private active = new Map<string, Recoverable>();
  /** PRNG state for deterministic but varied jitter. */
  private rng: () => number;

  constructor(seed = 0x42d2_7ca7) {
    let s = seed >>> 0;
    this.rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  }

  owns(_seed: ToolSeed): boolean {
    return true;
  }

  async fetch(
    seeds: ToolSeed[],
    priorState: ReadonlyMap<string, Tool>,
  ): Promise<VisibilityUpdate[]> {
    const out: VisibilityUpdate[] = [];
    const now = new Date().toISOString();

    for (const seed of seeds) {
      const prior = priorState.get(seed.id);
      if (!prior) continue;

      let observed = prior.observed;
      let causes = prior.causes;
      let note: string | undefined;

      // Normal jitter: ±0.2% drift around current fraction.
      const drift = (this.rng() - 0.5) * 0.004;
      const baseFraction = observed / Math.max(1, seed.denominator);
      let nextFraction = baseFraction + drift;

      // Active drop in flight?
      const recoverable = this.active.get(seed.id);
      if (recoverable) {
        // Pull current fraction toward target while still drifting slightly.
        const pull = (recoverable.targetFraction - nextFraction) * 0.35;
        nextFraction = nextFraction + pull;
        recoverable.recoverIn -= 1;
        if (recoverable.recoverIn <= 0) {
          this.active.delete(seed.id);
          note = `${seed.solution} recovered`;
        }
      } else if (this.rng() < RARE_DROP) {
        // Start a 1-3% drop, auto-recover in 2-5 ticks.
        const dropPct = 0.01 + this.rng() * 0.02;
        const target = Math.max(0, baseFraction - dropPct);
        const ticks = 2 + Math.floor(this.rng() * 4);
        this.active.set(seed.id, { toolId: seed.id, targetFraction: target, recoverIn: ticks });
        nextFraction = target;
        note = `${seed.solution} coverage dropped ${(dropPct * 100).toFixed(1)}%`;
      }

      observed = Math.max(
        0,
        Math.min(seed.denominator, Math.round(nextFraction * seed.denominator)),
      );

      // Rare: flip a cause flag.
      if (this.rng() < RARE_CAUSE_FLIP) {
        const flipped = this.flipCause(causes);
        if (flipped) {
          const { causes: nextCauses, message } = flipped;
          causes = nextCauses;
          note = `${seed.solution} — ${message}`;
        }
      }

      out.push({
        toolId: seed.id,
        observed,
        lastSync: now,
        causes,
        note,
      });
    }

    return out;
  }

  private flipCause(
    current: VisibilityCauseFlag[],
  ): { causes: VisibilityCauseFlag[]; message: string } | null {
    const all = Object.keys(CAUSES) as VisibilityCauseFlag[];
    const has = new Set(current);

    // 50/50 drop or add.
    const drop = current.length > 0 && this.rng() < 0.5;
    if (drop) {
      const idx = Math.floor(this.rng() * current.length);
      const removed = current[idx];
      const next = current.filter((c, i) => i !== idx);
      return { causes: next, message: `cleared "${CAUSES[removed].label}"` };
    }

    const candidates = all.filter((c) => !has.has(c));
    if (candidates.length === 0) return null;
    const added = candidates[Math.floor(this.rng() * candidates.length)];
    return {
      causes: [...current, added],
      message: `new cause flag "${CAUSES[added].label}"`,
    };
  }
}
