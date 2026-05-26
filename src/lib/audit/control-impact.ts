/**
 * Control impact resolution.
 *
 * Joins a single framework-control to:
 *   - its anchored tools (from frameworks.json)
 *   - the active visibility causes on those tools
 *   - the OEM-native loss reasons currently firing on those tools
 *   - recent risky config changes scoped to those tools
 *   - sibling controls in other frameworks (via control-correlations.json)
 *
 * Pure functions; no I/O. Consumed by ControlDetail + the auditor PDF export.
 */

import type { Framework, FrameworkControl, Tool, VisibilityCauseFlag } from "@/types/tool";
import { CAUSES } from "@/lib/visibility/causes";
import { reasonsForOem } from "@/lib/feeder/seed";
import type { OemLossReason } from "@/types/oem-reasons";
import type {
  ControlCorrelation,
  ControlCorrelationsFile,
} from "@/types/control-correlations";
import { ControlCorrelationsFileSchema } from "@/types/control-correlations";
import correlationsRaw from "../../../workspaces/abcl/control-correlations.json";
import changesRaw from "../../../workspaces/abcl/config-changes.json";
import { ConfigChangesFileSchema, type ConfigChange } from "@/types/config-changes";

const CORRELATIONS_DATA = ControlCorrelationsFileSchema.safeParse(correlationsRaw);
const CORRELATIONS: ControlCorrelation[] = CORRELATIONS_DATA.success
  ? CORRELATIONS_DATA.data.correlations
  : [];

const CHANGES_DATA = ConfigChangesFileSchema.safeParse(changesRaw);
const ALL_CHANGES: ConfigChange[] = CHANGES_DATA.success ? CHANGES_DATA.data.changes : [];

/** Build the "<frameworkId>/<controlId>" canonical reference. */
export function controlRef(frameworkId: string, controlId: string): string {
  return `${frameworkId}/${controlId}`;
}

export interface ControlImpact {
  /** Tools anchored to this control (resolved against the live feeder snapshot). */
  anchoredTools: Tool[];
  /** Coverage rollup across the anchored tools. */
  coverage: {
    covered: number;
    partial: number;
    gap: number;
    /** 0..1 — fraction of anchored tools at "green". */
    healthyRatio: number;
  };
  /** Distinct cause flags currently firing on any anchored tool. */
  activeCauses: { cause: VisibilityCauseFlag; toolIds: string[] }[];
  /** Distinct OEM loss reasons (resolved entries) currently firing on any anchored tool. */
  activeLossReasons: { reason: OemLossReason; toolIds: string[] }[];
  /** Risky config changes (last 30 entries) scoped to any anchored tool. */
  recentRiskyChanges: ConfigChange[];
  /** Sibling controls in other frameworks. */
  relatedControls: { correlation: ControlCorrelation; refs: string[] }[];
}

export function resolveControlImpact(
  frameworkId: string,
  control: FrameworkControl,
  tools: Tool[],
): ControlImpact {
  const anchoredTools = tools.filter((t) => control.anchorTools.includes(t.id));

  let covered = 0;
  let partial = 0;
  let gap = anchoredTools.length === 0 ? 1 : 0;
  for (const t of anchoredTools) {
    if (t.status === "green") covered += 1;
    else if (t.status === "amber") partial += 1;
    else covered += 0; // red counts as not covered
  }
  const healthyRatio = anchoredTools.length > 0 ? covered / anchoredTools.length : 0;

  // Active causes — group by cause flag with the tool ids that fire it.
  const causeMap = new Map<VisibilityCauseFlag, Set<string>>();
  for (const t of anchoredTools) {
    for (const c of t.causes) {
      if (!causeMap.has(c)) causeMap.set(c, new Set());
      causeMap.get(c)!.add(t.id);
    }
  }
  const activeCauses = Array.from(causeMap.entries())
    .map(([cause, ids]) => ({ cause, toolIds: Array.from(ids) }))
    .sort((a, b) => {
      const rank = { High: 0, Medium: 1, Low: 2 } as const;
      return rank[CAUSES[a.cause].weight] - rank[CAUSES[b.cause].weight];
    });

  // Active loss reasons — resolve each tool's activeLossReasons[] against
  // its OEM catalog.
  const reasonAccum = new Map<string, { reason: OemLossReason; toolIds: Set<string> }>();
  for (const t of anchoredTools) {
    if (!t.activeLossReasons || t.activeLossReasons.length === 0) continue;
    const catalog = reasonsForOem(t.oem);
    for (const code of t.activeLossReasons) {
      const entry = catalog.find((r) => r.code === code);
      if (!entry) continue;
      const key = `${t.oem}::${code}`;
      if (!reasonAccum.has(key)) {
        reasonAccum.set(key, { reason: entry, toolIds: new Set() });
      }
      reasonAccum.get(key)!.toolIds.add(t.id);
    }
  }
  const activeLossReasons = Array.from(reasonAccum.values())
    .map((v) => ({ reason: v.reason, toolIds: Array.from(v.toolIds) }))
    .sort((a, b) => {
      const sevRank = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
      return sevRank[a.reason.severity] - sevRank[b.reason.severity];
    });

  // Risky changes scoped to anchored tools (most-recent first; cap 12).
  const anchoredIds = new Set(anchoredTools.map((t) => t.id));
  const recentRiskyChanges = ALL_CHANGES.filter((c) => anchoredIds.has(c.toolId))
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, 12);

  // Related controls in other frameworks.
  const ref = controlRef(frameworkId, control.id);
  const relatedControls = CORRELATIONS.filter((corr) => corr.controls.includes(ref))
    .map((corr) => ({
      correlation: corr,
      refs: corr.controls.filter((c) => c !== ref),
    }))
    .sort((a, b) => b.refs.length - a.refs.length);

  return {
    anchoredTools,
    coverage: { covered, partial, gap, healthyRatio },
    activeCauses,
    activeLossReasons,
    recentRiskyChanges,
    relatedControls,
  };
}

/** Look up a control across frameworks via its full ref. */
export function findControlByRef(
  ref: string,
  frameworks: Framework[],
): { framework: Framework; control: FrameworkControl } | undefined {
  const slash = ref.indexOf("/");
  if (slash < 0) return undefined;
  const fwId = ref.slice(0, slash);
  const cid = ref.slice(slash + 1);
  const fw = frameworks.find((f) => f.id === fwId);
  if (!fw) return undefined;
  const c = fw.controls.find((c) => c.id === cid);
  if (!c) return undefined;
  return { framework: fw, control: c };
}
