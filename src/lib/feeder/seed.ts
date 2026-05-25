/**
 * Static seed snapshot for the dashboard.
 *
 * Derives observed counts, active causes, and OEM-native loss reasons
 * deterministically from each tool's `mockProfile` so the layout and
 * breakdown panel have data to render.
 */

import type { MockProfile, Tool, ToolSeed, VisibilityCauseFlag } from "@/types/tool";
import { buildTool } from "@/lib/visibility/score";
import oemReasonsRaw from "../../../workspaces/abcl/oem-reasons.json";
import { OemReasonsFileSchema, type OemLossReason } from "@/types/oem-reasons";

const OEM_REASONS = OemReasonsFileSchema.parse(oemReasonsRaw);

export interface ProfileShape {
  observedFraction: number;
  causes: VisibilityCauseFlag[];
  /** Hours since lastSync; > tower SLO triggers `stale_data` semantics in real feeder. */
  lastSyncHoursAgo: number;
  /** How many OEM-native reasons to surface for this profile. */
  reasonCount: number;
  /** Lowest severity tier to draw from in the catalog. */
  reasonSeverityFloor: OemLossReason["severity"];
}

export const PROFILE_SHAPES: Record<MockProfile, ProfileShape> = {
  healthy: {
    observedFraction: 0.972,
    causes: [],
    lastSyncHoursAgo: 0.1,
    reasonCount: 0,
    reasonSeverityFloor: "Low",
  },
  degraded: {
    observedFraction: 0.88,
    causes: ["policy_drift", "decommission_ghost"],
    lastSyncHoursAgo: 2,
    reasonCount: 2,
    reasonSeverityFloor: "Medium",
  },
  flapping: {
    observedFraction: 0.93,
    causes: ["telemetry_blocked"],
    lastSyncHoursAgo: 0.5,
    reasonCount: 1,
    reasonSeverityFloor: "Medium",
  },
  stale: {
    observedFraction: 0.72,
    causes: ["stale_data", "agent_silent"],
    lastSyncHoursAgo: 48,
    reasonCount: 3,
    reasonSeverityFloor: "High",
  },
};

export function shapeFor(profile: MockProfile): ProfileShape {
  return PROFILE_SHAPES[profile];
}

/**
 * OEM-native reasons for a given tool. Matches the OEM display string
 * exactly, then falls back to the first whitespace-delimited token
 * ("Imperva WAF" → "Imperva" etc.).
 */
export function reasonsForOem(oem: string): OemLossReason[] {
  if (OEM_REASONS.reasonsByOem[oem]) return OEM_REASONS.reasonsByOem[oem];
  const head = oem.split(/\s+/)[0];
  return OEM_REASONS.reasonsByOem[head] ?? [];
}

const SEVERITY_RANK: Record<OemLossReason["severity"], number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function pickReasonCodes(seedId: string, oem: string, shape: ProfileShape): string[] {
  if (shape.reasonCount === 0) return [];
  const catalog = reasonsForOem(oem);
  if (catalog.length === 0) return [];
  let h = 0;
  for (let i = 0; i < seedId.length; i++) h = (h * 31 + seedId.charCodeAt(i)) >>> 0;
  const rand = () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
  const floor = SEVERITY_RANK[shape.reasonSeverityFloor];
  const ranked = [...catalog].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
  const eligible = ranked.filter((r) => SEVERITY_RANK[r.severity] >= floor);
  const pool = eligible.length > 0 ? eligible : ranked;
  const picked: OemLossReason[] = [];
  const used = new Set<string>();
  while (picked.length < Math.min(shape.reasonCount, pool.length)) {
    const idx = Math.floor(rand() * pool.length);
    const r = pool[idx];
    if (used.has(r.code)) continue;
    used.add(r.code);
    picked.push(r);
  }
  return picked.map((r) => r.code);
}

export function seedToolFromProfile(seed: ToolSeed): Tool {
  const shape = shapeFor(seed.mockProfile);
  const observed = Math.floor(seed.denominator * shape.observedFraction);
  const lastSync = new Date(Date.now() - shape.lastSyncHoursAgo * 3_600_000).toISOString();
  const activeLossReasons = pickReasonCodes(seed.id, seed.oem, shape);
  return buildTool(seed, { observed, lastSync, causes: shape.causes, activeLossReasons });
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
