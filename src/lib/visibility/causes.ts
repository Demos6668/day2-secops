/**
 * Cause taxonomy + weights for visibility loss.
 *
 * Validated against the framework references in /RAG_MODEL.md:
 *   - CIS Controls v8.1 (Controls 1, 2, 4, 10)
 *   - NIST CSF 2.0 (ID.AM-01/02, DE.CM-01)
 *   - ISO/IEC 27001:2022 (A.5.9, A.8.1, A.8.7, A.8.16)
 *   - RBI Cyber Security Framework (Inventory + Monitoring annexures)
 *   - SEBI CSCRF (ID.AM, DE.CM)
 *
 * `decommission_ghost` counts toward score at Low weight (locked-in decision §7).
 */

import type { VisibilityCauseFlag } from "@/types/tool";
import type { CauseMeta } from "@/lib/rag-tokens";

export const CAUSES: Record<VisibilityCauseFlag, CauseMeta> = {
  agent_absent: {
    key: "agent_absent",
    label: "Agent absent",
    description: "Asset in CMDB but no agent enrolled.",
    weight: "High",
    forcesRedOnCritical: true,
  },
  agent_silent: {
    key: "agent_silent",
    label: "Agent silent",
    description: "Enrolled but no heartbeat within SLA window.",
    weight: "High",
    forcesRedOnCritical: true,
  },
  coverage_gap: {
    key: "coverage_gap",
    label: "Coverage gap",
    description: "Tool denominator exceeds deployed seats / licenses.",
    weight: "High",
    forcesRedOnCritical: true,
  },
  policy_drift: {
    key: "policy_drift",
    label: "Policy drift",
    description: "Reporting but on stale policy / monitor-only mode.",
    weight: "Medium",
    forcesRedOnCritical: false,
  },
  telemetry_blocked: {
    key: "telemetry_blocked",
    label: "Telemetry blocked",
    description: "Agent up, logs not reaching collector (proxy / cert / network).",
    weight: "High",
    forcesRedOnCritical: true,
  },
  stale_data: {
    key: "stale_data",
    label: "Stale data",
    description: "Last sync beyond freshness SLO for tower.",
    weight: "Medium",
    forcesRedOnCritical: false,
  },
  eol_unsupported: {
    key: "eol_unsupported",
    label: "EOL / unsupported",
    description: "OS or agent version unsupported by vendor.",
    weight: "Medium",
    forcesRedOnCritical: false,
  },
  decommission_ghost: {
    key: "decommission_ghost",
    label: "Decommission ghost",
    description: "Asset retired but still counted in denominator.",
    weight: "Low",
    forcesRedOnCritical: false,
  },
};

export const CAUSE_ORDER: VisibilityCauseFlag[] = [
  "agent_absent",
  "agent_silent",
  "coverage_gap",
  "telemetry_blocked",
  "policy_drift",
  "stale_data",
  "eol_unsupported",
  "decommission_ghost",
];

export function getCauseMeta(key: VisibilityCauseFlag): CauseMeta {
  return CAUSES[key];
}
