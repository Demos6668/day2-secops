/**
 * Control coverage drift between two point-in-time snapshots.
 *
 * For each (framework, control) pair, compute its CellStatus in both the
 * `before` and `after` snapshots, then keep the rows whose status flipped.
 *
 * Drives the "Coverage drift since last snapshot" section on the Audit
 * page. Pure function — no I/O.
 */

import type { Framework, Tool } from "@/types/tool";
import { rollupControl, type CellStatus } from "@/lib/audit/coverage";
import type { Snapshot } from "@/lib/change/snapshots";

export interface ControlDrift {
  frameworkId: string;
  frameworkShort: string;
  controlId: string;
  controlTitle: string;
  before: CellStatus;
  after: CellStatus;
  /** Direction: -1 worse, 0 lateral, +1 better. */
  delta: -1 | 0 | 1;
}

const CELL_RANK: Record<CellStatus, number> = {
  covered: 3,
  partial: 2,
  gap: 1,
  na: 1,
};

function rollupAll(tools: Tool[], frameworks: Framework[]) {
  const out = new Map<string, CellStatus>();
  for (const f of frameworks) {
    for (const c of f.controls) {
      out.set(`${f.id}/${c.id}`, rollupControl(c, tools).overall);
    }
  }
  return out;
}

export function controlCoverageDrift(
  before: Snapshot,
  after: Snapshot,
  frameworks: Framework[],
): ControlDrift[] {
  const beforeMap = rollupAll(before.tools, frameworks);
  const afterMap = rollupAll(after.tools, frameworks);

  const out: ControlDrift[] = [];
  for (const f of frameworks) {
    for (const c of f.controls) {
      const key = `${f.id}/${c.id}`;
      const b = beforeMap.get(key) ?? "gap";
      const a = afterMap.get(key) ?? "gap";
      if (a === b) continue;
      const db = CELL_RANK[b];
      const da = CELL_RANK[a];
      const delta: -1 | 0 | 1 = da > db ? 1 : da < db ? -1 : 0;
      out.push({
        frameworkId: f.id,
        frameworkShort: f.shortName,
        controlId: c.id,
        controlTitle: c.title,
        before: b,
        after: a,
        delta,
      });
    }
  }

  // Worst-first, then improvements, then alphabetical.
  return out.sort((a, b) => a.delta - b.delta || a.frameworkShort.localeCompare(b.frameworkShort));
}
