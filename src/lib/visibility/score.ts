/**
 * RAG score computation (brief §4.2).
 *
 *   visibility_pct  = observed / denominator
 *   gap_penalty     = (1 - visibility_pct) * 100 * severity_weight
 *   cause_penalty   = Σ cause weights
 *   score           = 100 - gap_penalty - cause_penalty
 *
 *   status (default thresholds):
 *     score >= 90 → green
 *     70 <= score < 90 → amber
 *     score < 70 → red
 *
 *   Hard overrides (Critical only):
 *     • any High-weight cause active            → red
 *     • visibility_pct < 0.85                   → red
 *
 * Pure function. Unit-testable. No I/O. No React.
 */

import type { RagStatus, Severity, Tool, ToolSeed, VisibilityCauseFlag } from "@/types/tool";
import { CAUSE_WEIGHT_NUMERIC, RAG_THRESHOLDS, SEVERITY_WEIGHT } from "@/lib/rag-tokens";
import { CAUSES } from "@/lib/visibility/causes";

export interface ScoreBreakdown {
  visibilityPct: number; // 0..1
  severityWeight: number;
  gapPenalty: number;
  causePenalty: number;
  score: number;
  status: RagStatus;
  /** When hard overrides fired, this is the reason. */
  override?: "critical_high_cause" | "critical_low_visibility";
  activeCauses: VisibilityCauseFlag[];
}

export interface ScoreInput {
  severity: Severity;
  observed: number;
  denominator: number;
  causes: VisibilityCauseFlag[];
}

export function scoreVisibility(input: ScoreInput): ScoreBreakdown {
  const { severity, observed, denominator, causes } = input;

  const visibilityPct = denominator > 0 ? clamp01(observed / denominator) : 0;
  const severityWeight = SEVERITY_WEIGHT[severity];
  const gapPenalty = (1 - visibilityPct) * 100 * severityWeight;

  const causePenalty = causes.reduce((sum, c) => sum + CAUSE_WEIGHT_NUMERIC[CAUSES[c].weight], 0);

  const rawScore = 100 - gapPenalty - causePenalty;
  const score = Math.max(0, Math.min(100, rawScore));

  let status: RagStatus = scoreToStatus(score);
  let override: ScoreBreakdown["override"];

  if (severity === "Critical") {
    const hasForcingCause = causes.some((c) => CAUSES[c].forcesRedOnCritical);
    if (hasForcingCause) {
      status = "red";
      override = "critical_high_cause";
    } else if (visibilityPct < 0.85) {
      status = "red";
      override = "critical_low_visibility";
    }
  }

  return {
    visibilityPct,
    severityWeight,
    gapPenalty,
    causePenalty,
    score,
    status,
    override,
    activeCauses: [...causes],
  };
}

export function scoreToStatus(score: number): RagStatus {
  if (score >= RAG_THRESHOLDS.greenMin) return "green";
  if (score >= RAG_THRESHOLDS.amberMin) return "amber";
  return "red";
}

/** Convenience: enrich a ToolSeed + runtime values into a full Tool. */
export function buildTool(
  seed: ToolSeed,
  runtime: {
    observed: number;
    lastSync: string;
    causes: VisibilityCauseFlag[];
    activeLossReasons?: string[];
  },
): Tool {
  const breakdown = scoreVisibility({
    severity: seed.severity,
    observed: runtime.observed,
    denominator: seed.denominator,
    causes: runtime.causes,
  });
  return {
    ...seed,
    observed: runtime.observed,
    lastSync: runtime.lastSync,
    causes: runtime.causes,
    activeLossReasons: runtime.activeLossReasons ?? [],
    status: breakdown.status,
    score: roundTo(breakdown.score, 2),
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function roundTo(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
