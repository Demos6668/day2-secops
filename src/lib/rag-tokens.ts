/**
 * RAG (Red / Amber / Green) tokens for "loss of asset visibility" status.
 *
 * Decoupled from severity tokens in `design-tokens.ts` on purpose:
 *  - Severity describes the tool's importance (Critical/Moderate/Low).
 *  - RAG describes the tool's current visibility health.
 * Mixing them led to confusing UI in day2.osint forks; we keep them separate.
 *
 * WCAG verification against the card background `#161B22` is documented in
 * /RAG_MODEL.md. All three values pass WCAG 2.1 AA contrast for normal text.
 */

import { CheckCircle2, AlertTriangle, OctagonAlert, type LucideIcon } from "lucide-react";
import type { RagStatus, VisibilityCauseFlag, Severity } from "@/types/tool";

export interface RagToken {
  hex: string;
  fg: string;
  bg: string;
  border: string;
  ring: string;
  dot: string;
  icon: LucideIcon;
  label: string;
  /** Short A11y description for screen readers. */
  aria: string;
}

export const RAG_TOKENS: Record<RagStatus, RagToken> = {
  green: {
    hex: "#22C55E",
    fg: "text-[#22C55E]",
    bg: "bg-[#22C55E]/12",
    border: "border-[#22C55E]/30",
    ring: "ring-[#22C55E]/40",
    dot: "bg-[#22C55E]",
    icon: CheckCircle2,
    label: "Green",
    aria: "Visibility healthy",
  },
  amber: {
    hex: "#D97706",
    fg: "text-[#D97706]",
    bg: "bg-[#D97706]/12",
    border: "border-[#D97706]/30",
    ring: "ring-[#D97706]/40",
    dot: "bg-[#D97706]",
    icon: AlertTriangle,
    label: "Amber",
    aria: "Visibility degraded",
  },
  red: {
    hex: "#EF4444",
    fg: "text-[#EF4444]",
    bg: "bg-[#EF4444]/12",
    border: "border-[#EF4444]/30",
    ring: "ring-[#EF4444]/40",
    dot: "bg-[#EF4444]",
    icon: OctagonAlert,
    label: "Red",
    aria: "Visibility critical",
  },
};

export function getRagToken(status: RagStatus): RagToken {
  return RAG_TOKENS[status];
}

/** Severity → RAG-score multiplier (per the brief). */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  Critical: 1.5,
  Moderate: 1.0,
  Low: 0.7,
};

/** RAG status thresholds — score-driven (brief §4.2). */
export const RAG_THRESHOLDS = {
  greenMin: 90,
  amberMin: 70,
} as const;

/** Cause flag weights (High = 12, Medium = 6, Low = 2). Tunable in causes.ts. */
export type CauseWeight = "High" | "Medium" | "Low";
export const CAUSE_WEIGHT_NUMERIC: Record<CauseWeight, number> = {
  High: 12,
  Medium: 6,
  Low: 2,
};

export interface CauseMeta {
  key: VisibilityCauseFlag;
  label: string;
  description: string;
  weight: CauseWeight;
  /** When set, this cause forces red on Critical tools regardless of score. */
  forcesRedOnCritical: boolean;
}
