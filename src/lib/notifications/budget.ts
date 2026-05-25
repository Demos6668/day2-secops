/**
 * Notification budget + de-duplication.
 *
 * Smarter defaults: toasts are SILENT by default. Everything lives in the
 * NotificationCenter inbox + the ActivityPill bell badge. Only Critical-on-
 * Critical RED fires a toast, and only when the user opted-in via Settings
 * ("Pop toasts" = on).
 *
 *   - R1: even when toasts opted-in, max 2 per 60 s for Critical, 0 for Mod/Low
 *   - R2: dedup by key within 5 min
 *   - R3: never toast on the very first 5s after mount (anti-snapshot-noise)
 *   - R4: never toast when inbox is open or document is hidden
 *   - R5: nothing is silently dropped — every event lands in the inbox
 *   - R6: recovery never toasts; the bell pulses + the pill ticks
 *   - R7: per-session first-fire-only — caller maintains its own gate
 */

import type { RagStatus, Severity } from "@/types/tool";

export interface NotificationEvent {
  id: string;
  at: number;
  key: string;
  title: string;
  description?: string;
  kind: "rag_flip" | "cause_added" | "cause_cleared" | "recovered" | "info";
  severity: Severity;
  toastFired: boolean;
  toolId?: string;
  fromStatus?: RagStatus;
  toStatus?: RagStatus;
  read: boolean;
  /** Number of underlying events this row represents (aggregation). */
  count?: number;
}

const TIER_BUDGET: Record<Severity, number> = {
  Critical: 2,
  Moderate: 0,
  Low: 0,
};

const BUDGET_WINDOW_MS = 60_000;
const DEDUP_WINDOW_MS = 5 * 60_000;
const WARMUP_MS = 5_000;

export interface ToastDecisionInput {
  severity: Severity;
  forceToast?: boolean;
  recent: { at: number; severity: Severity; key: string; toastFired: boolean }[];
  key: string;
  now: number;
  popToasts: boolean;
  inboxOpen: boolean;
  documentHidden: boolean;
  msSinceMount: number;
}

export interface ToastDecision {
  toast: boolean;
  reason:
    | "force"
    | "budget_ok"
    | "budget_exhausted"
    | "dedup"
    | "tier_gated"
    | "toasts_off"
    | "inbox_open"
    | "document_hidden"
    | "warmup";
}

export function decideToast(input: ToastDecisionInput): ToastDecision {
  if (input.forceToast && input.msSinceMount >= WARMUP_MS) {
    if (input.inboxOpen) return { toast: false, reason: "inbox_open" };
    if (input.documentHidden) return { toast: false, reason: "document_hidden" };
    return { toast: true, reason: "force" };
  }

  if (!input.popToasts) return { toast: false, reason: "toasts_off" };

  if (input.msSinceMount < WARMUP_MS) {
    return { toast: false, reason: "warmup" };
  }

  if (input.inboxOpen) return { toast: false, reason: "inbox_open" };
  if (input.documentHidden) return { toast: false, reason: "document_hidden" };

  if (TIER_BUDGET[input.severity] === 0) {
    return { toast: false, reason: "tier_gated" };
  }

  const dupSince = input.now - DEDUP_WINDOW_MS;
  const dup = input.recent.find((e) => e.key === input.key && e.toastFired && e.at >= dupSince);
  if (dup) return { toast: false, reason: "dedup" };

  const since = input.now - BUDGET_WINDOW_MS;
  const recentToasts = input.recent.filter(
    (e) => e.severity === input.severity && e.toastFired && e.at >= since,
  ).length;
  if (recentToasts >= TIER_BUDGET[input.severity]) {
    return { toast: false, reason: "budget_exhausted" };
  }

  return { toast: true, reason: "budget_ok" };
}

export function buildEventKey(input: {
  toolId?: string;
  kind: NotificationEvent["kind"];
  toStatus?: RagStatus;
}): string {
  return `${input.toolId ?? "global"}|${input.kind}|${input.toStatus ?? "-"}`;
}

export function buildBucketKey(input: {
  toolId?: string;
  kind: NotificationEvent["kind"];
}): string {
  return `${input.toolId ?? "global"}|${input.kind}`;
}

export const INBOX_AGGREGATION_WINDOW_MS = 5 * 60_000;
