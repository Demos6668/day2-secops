/**
 * Static seed snapshot for the dashboard (Phase 2).
 *
 * Phase 3 will replace this with a live FeederProvider that ticks every
 * 3–7 s and applies jitter. For now we deterministically derive observed
 * counts + active causes from each tool's `mockProfile` so the layout
 * and breakdown panel have data to render.
 */

import type { MockProfile, Tool, ToolSeed, VisibilityCauseFlag } from "@/types/tool";
import { buildTool } from "@/lib/visibility/score";

export interface ProfileShape {
  observedFraction: number;
  causes: VisibilityCauseFlag[];
  /** Hours since lastSync; > tower SLO triggers `stale_data` semantics in real feeder. */
  lastSyncHoursAgo: number;
}

export const PROFILE_SHAPES: Record<MockProfile, ProfileShape> = {
  healthy: { observedFraction: 0.972, causes: [], lastSyncHoursAgo: 0.1 },
  degraded: {
    observedFraction: 0.88,
    causes: ["policy_drift", "decommission_ghost"],
    lastSyncHoursAgo: 2,
  },
  flapping: {
    observedFraction: 0.93,
    causes: ["telemetry_blocked"],
    lastSyncHoursAgo: 0.5,
  },
  stale: {
    observedFraction: 0.72,
    causes: ["stale_data", "agent_silent"],
    lastSyncHoursAgo: 48,
  },
};

export function shapeFor(profile: MockProfile): ProfileShape {
  return PROFILE_SHAPES[profile];
}

export function seedToolFromProfile(seed: ToolSeed): Tool {
  const shape = shapeFor(seed.mockProfile);
  const observed = Math.floor(seed.denominator * shape.observedFraction);
  const lastSync = new Date(Date.now() - shape.lastSyncHoursAgo * 3_600_000).toISOString();
  return buildTool(seed, { observed, lastSync, causes: shape.causes });
}

/**
 * Deterministic 24-point visibility history for the sparkline.
 * Same seed → same series, so the chart doesn't flicker between renders.
 */
export function seedVisibilityHistory(tool: Tool, points = 24): { t: number; pct: number }[] {
  const shape = shapeFor(tool.mockProfile);
  const center = tool.observed / Math.max(1, tool.denominator);
  // Cheap deterministic PRNG seeded by tool id.
  let h = 0;
  for (let i = 0; i < tool.id.length; i++) h = (h * 31 + tool.id.charCodeAt(i)) >>> 0;
  const rand = () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
  const amplitude = shape.observedFraction > 0.95 ? 0.01 : 0.04;
  const out: { t: number; pct: number }[] = [];
  for (let i = 0; i < points; i++) {
    const drift = (rand() - 0.5) * amplitude * 2;
    const pct = Math.max(0, Math.min(1, center + drift));
    out.push({ t: i, pct });
  }
  return out;
}
