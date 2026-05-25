/**
 * Snapshot store for the Change Management module.
 *
 * v1 persists in localStorage with 90-day TTL. Phase-real swap-in: small
 * Express receiver writing to a real KV store. Public surface stays the same.
 */

import { z } from "zod";
import { ToolSchema, type RagStatus, type Tool } from "@/types/tool";

const STORAGE_KEY = "abcl-secviz:snapshots";
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETENTION_DAYS = 90;

const SnapshotSchema = z.object({
  id: z.string(),
  takenAt: z.string(),
  label: z.string().optional(),
  trigger: z.string(),
  source: z.string().optional(),
  tools: z.array(ToolSchema),
});
const StoreShapeSchema = z.object({
  snapshots: z.array(SnapshotSchema).default([]),
});

export interface SnapshotMeta {
  id: string;
  takenAt: string;
  label?: string;
  /** "manual" or e.g. "scheduled" / "auto-on-flip" */
  trigger: string;
  /** Free-form attribution. Defaults to "mock-feeder" until real sources wire up. */
  source?: string;
}

export interface Snapshot extends SnapshotMeta {
  tools: Tool[];
}

interface StoreShape {
  snapshots: Snapshot[];
}

function load(): StoreShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { snapshots: [] };
    // SEC C-2 / CODE H-3: validate-on-read. Don't trust localStorage; XSS-injected
    // payloads or stale-schema data would otherwise reach React unchecked.
    const parsed = StoreShapeSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn("[snapshots] discarded malformed store:", parsed.error.issues.slice(0, 2));
      return { snapshots: [] };
    }
    return parsed.data;
  } catch {
    return { snapshots: [] };
  }
}

function save(store: StoreShape) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function pruneOlderThan(retentionDays = DEFAULT_RETENTION_DAYS): number {
  const store = load();
  const cutoff = Date.now() - retentionDays * DAY_MS;
  const kept = store.snapshots.filter((s) => new Date(s.takenAt).getTime() >= cutoff);
  const removed = store.snapshots.length - kept.length;
  if (removed > 0) save({ snapshots: kept });
  return removed;
}

export function listSnapshots(): SnapshotMeta[] {
  return load()
    .snapshots.map(({ id, takenAt, label, trigger, source }) => ({
      id,
      takenAt,
      label,
      trigger,
      source,
    }))
    .sort((a, b) => (a.takenAt < b.takenAt ? 1 : -1));
}

export function getSnapshot(id: string): Snapshot | undefined {
  return load().snapshots.find((s) => s.id === id);
}

export function captureSnapshot(
  tools: Tool[],
  opts: { label?: string; trigger?: string; source?: string } = {},
): Snapshot {
  pruneOlderThan();
  const store = load();
  const snap: Snapshot = {
    id: `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    takenAt: new Date().toISOString(),
    label: opts.label,
    trigger: opts.trigger ?? "manual",
    source: opts.source ?? "mock-feeder",
    tools: tools.map((t) => ({ ...t, causes: [...t.causes] })),
  };
  store.snapshots.push(snap);
  save(store);
  return snap;
}

export function deleteSnapshot(id: string): void {
  const store = load();
  save({ snapshots: store.snapshots.filter((s) => s.id !== id) });
}

// -- Diffing ---------------------------------------------------------------

export interface ToolDiff {
  kind:
    | "added"
    | "removed"
    | "status_changed"
    | "severity_changed"
    | "coverage_shifted"
    | "causes_changed";
  toolId: string;
  solution: string;
  before?: Partial<Tool>;
  after?: Partial<Tool>;
  detail?: string;
}

export function diffSnapshots(before: Snapshot, after: Snapshot): ToolDiff[] {
  const beforeMap = new Map(before.tools.map((t) => [t.id, t]));
  const afterMap = new Map(after.tools.map((t) => [t.id, t]));
  const out: ToolDiff[] = [];

  for (const [id, b] of beforeMap) {
    if (!afterMap.has(id)) {
      out.push({ kind: "removed", toolId: id, solution: b.solution });
    }
  }

  for (const [id, a] of afterMap) {
    const b = beforeMap.get(id);
    if (!b) {
      out.push({ kind: "added", toolId: id, solution: a.solution });
      continue;
    }
    if (b.status !== a.status) {
      out.push({
        kind: "status_changed",
        toolId: id,
        solution: a.solution,
        before: { status: b.status },
        after: { status: a.status },
        detail: `RAG ${ragOrder(b.status) > ragOrder(a.status) ? "↓" : "↑"} ${b.status.toUpperCase()} → ${a.status.toUpperCase()}`,
      });
    }
    if (b.severity !== a.severity) {
      out.push({
        kind: "severity_changed",
        toolId: id,
        solution: a.solution,
        before: { severity: b.severity },
        after: { severity: a.severity },
        detail: `${b.severity} → ${a.severity}`,
      });
    }
    const bPct = b.observed / Math.max(1, b.denominator);
    const aPct = a.observed / Math.max(1, a.denominator);
    if (Math.abs(bPct - aPct) >= 0.01) {
      out.push({
        kind: "coverage_shifted",
        toolId: id,
        solution: a.solution,
        before: { observed: b.observed },
        after: { observed: a.observed },
        detail: `${(bPct * 100).toFixed(1)}% → ${(aPct * 100).toFixed(1)}%`,
      });
    }
    const causesB = new Set(b.causes);
    const causesA = new Set(a.causes);
    const added = [...causesA].filter((c) => !causesB.has(c));
    const removed = [...causesB].filter((c) => !causesA.has(c));
    if (added.length || removed.length) {
      const parts: string[] = [];
      if (added.length) parts.push(`+ ${added.join(", ")}`);
      if (removed.length) parts.push(`− ${removed.join(", ")}`);
      out.push({
        kind: "causes_changed",
        toolId: id,
        solution: a.solution,
        before: { causes: b.causes },
        after: { causes: a.causes },
        detail: parts.join("  "),
      });
    }
  }

  return out;
}

function ragOrder(s: RagStatus): number {
  return s === "green" ? 2 : s === "amber" ? 1 : 0;
}
