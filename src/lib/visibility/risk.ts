/**
 * Numeric risk weight per tool (research move #4, refs Snyk / GitHub Security).
 *
 * Combines severity weight × visibility deficit + cause penalty + staleness
 * decay so two reds can rank against each other. Higher = worse.
 *
 * Time factor: a tool whose `lastSync` is well past its tower's freshness SLO
 * accrues a staleness penalty proportional to the overrun, capped at 24 pts.
 */

import type { Tool, WorkspaceConfig } from "@/types/tool";
import { TOWER_FRESHNESS_KEY } from "@/types/tool";
import { CAUSE_WEIGHT_NUMERIC, SEVERITY_WEIGHT } from "@/lib/rag-tokens";
import { CAUSES } from "@/lib/visibility/causes";

export type RiskReasonKind = "coverage_gap" | "cause_penalty" | "status_penalty" | "staleness";

export interface RiskReasonLine {
  kind: RiskReasonKind;
  delta: number;
  label: string;
}

export interface RiskScore {
  total: number;
  visibilityDeficit: number;
  causePenalty: number;
  stalenessPenalty: number;
  statusBonus: number;
  reasons: RiskReasonLine[];
}

const STALENESS_CAP = 24;
const STALENESS_FACTOR = 8;

export function riskScoreFor(tool: Tool, workspace?: WorkspaceConfig): RiskScore {
  const visibility = tool.observed / Math.max(1, tool.denominator);
  const visibilityDeficit =
    (1 - Math.max(0, Math.min(1, visibility))) * 100 * SEVERITY_WEIGHT[tool.severity];

  const causePenalty = tool.causes.reduce((s, c) => s + CAUSE_WEIGHT_NUMERIC[CAUSES[c].weight], 0);

  const statusBonus = tool.status === "red" ? 20 : tool.status === "amber" ? 5 : 0;

  const sloHours =
    tool.freshnessSloHoursOverride ??
    (workspace ? workspace.freshnessSloHours[TOWER_FRESHNESS_KEY[tool.tower]] : 12);
  const hoursSinceSync = Math.max(0, (Date.now() - new Date(tool.lastSync).getTime()) / 3_600_000);
  const stalenessOverrun = Math.max(0, hoursSinceSync - sloHours) / Math.max(1, sloHours);
  const stalenessPenalty = Math.min(STALENESS_CAP, stalenessOverrun * STALENESS_FACTOR);

  const reasons: RiskReasonLine[] = [];
  if (visibilityDeficit > 0.5) {
    reasons.push({
      kind: "coverage_gap",
      delta: visibilityDeficit,
      label: `−${visibilityDeficit.toFixed(0)} from coverage gap (${(visibility * 100).toFixed(0)}% visible × ${SEVERITY_WEIGHT[tool.severity].toFixed(1)} severity weight)`,
    });
  }
  if (causePenalty > 0) {
    const topCause = tool.causes
      .map((c) => CAUSES[c])
      .sort((a, b) => CAUSE_WEIGHT_NUMERIC[b.weight] - CAUSE_WEIGHT_NUMERIC[a.weight])[0];
    const otherCount = Math.max(0, tool.causes.length - 1);
    const otherSuffix = otherCount > 0 ? ` + ${otherCount} more` : "";
    reasons.push({
      kind: "cause_penalty",
      delta: causePenalty,
      label: `−${causePenalty} from cause flags (${topCause.label} ${topCause.weight}${otherSuffix})`,
    });
  }
  if (stalenessPenalty > 0.5) {
    reasons.push({
      kind: "staleness",
      delta: stalenessPenalty,
      label: `−${stalenessPenalty.toFixed(0)} from staleness (${hoursSinceSync.toFixed(0)}h since sync vs ${sloHours}h SLO)`,
    });
  }
  if (statusBonus > 0) {
    reasons.push({
      kind: "status_penalty",
      delta: statusBonus,
      label: `+${statusBonus} status penalty (${tool.status.toUpperCase()})`,
    });
  }

  return {
    total: visibilityDeficit + causePenalty + stalenessPenalty + statusBonus,
    visibilityDeficit,
    causePenalty,
    stalenessPenalty,
    statusBonus,
    reasons,
  };
}

export interface RankedTool extends Tool {
  risk: number;
  reasons: RiskReasonLine[];
  stalenessPenalty: number;
}

export function rankByRisk(tools: Tool[], workspace?: WorkspaceConfig): RankedTool[] {
  return tools
    .map((t) => {
      const s = riskScoreFor(t, workspace);
      return { ...t, risk: s.total, reasons: s.reasons, stalenessPenalty: s.stalenessPenalty };
    })
    .sort((a, b) => b.risk - a.risk);
}
