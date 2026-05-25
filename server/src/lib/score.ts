/**
 * Server-side mirror of the visibility score formula.
 *
 * Kept in lock-step with src/lib/visibility/score.ts on the frontend. If the
 * formula changes, change both. The server holds canonical state so the
 * frontend can trust what it reads.
 */

export type Severity = "Critical" | "Moderate" | "Low";
export type RagStatus = "green" | "amber" | "red";
export type VisibilityCauseFlag =
  | "agent_absent"
  | "agent_silent"
  | "coverage_gap"
  | "policy_drift"
  | "telemetry_blocked"
  | "stale_data"
  | "eol_unsupported"
  | "decommission_ghost";

const SEVERITY_WEIGHT: Record<Severity, number> = {
  Critical: 1.5,
  Moderate: 1.0,
  Low: 0.7,
};

const CAUSE_WEIGHT_NUMERIC = { High: 12, Medium: 6, Low: 2 } as const;

const CAUSE_META: Record<
  VisibilityCauseFlag,
  { weight: keyof typeof CAUSE_WEIGHT_NUMERIC; forcesRedOnCritical: boolean }
> = {
  agent_absent: { weight: "High", forcesRedOnCritical: true },
  agent_silent: { weight: "High", forcesRedOnCritical: true },
  coverage_gap: { weight: "High", forcesRedOnCritical: true },
  policy_drift: { weight: "Medium", forcesRedOnCritical: false },
  telemetry_blocked: { weight: "High", forcesRedOnCritical: true },
  stale_data: { weight: "Medium", forcesRedOnCritical: false },
  eol_unsupported: { weight: "Medium", forcesRedOnCritical: false },
  decommission_ghost: { weight: "Low", forcesRedOnCritical: false },
};

export interface ScoreInput {
  severity: Severity;
  observed: number;
  denominator: number;
  causes: VisibilityCauseFlag[];
}

export interface ScoreOutput {
  visibilityPct: number;
  gapPenalty: number;
  causePenalty: number;
  score: number;
  status: RagStatus;
}

export function scoreVisibility(input: ScoreInput): ScoreOutput {
  const { severity, observed, denominator, causes } = input;
  const visibilityPct = denominator > 0 ? Math.max(0, Math.min(1, observed / denominator)) : 0;
  const gapPenalty = (1 - visibilityPct) * 100 * SEVERITY_WEIGHT[severity];
  const causePenalty = causes.reduce(
    (s, c) => s + CAUSE_WEIGHT_NUMERIC[CAUSE_META[c].weight],
    0,
  );
  const raw = 100 - gapPenalty - causePenalty;
  const score = Math.max(0, Math.min(100, raw));
  let status: RagStatus = score >= 90 ? "green" : score >= 70 ? "amber" : "red";
  if (severity === "Critical") {
    if (causes.some((c) => CAUSE_META[c].forcesRedOnCritical)) status = "red";
    else if (visibilityPct < 0.85) status = "red";
  }
  return { visibilityPct, gapPenalty, causePenalty, score, status };
}
