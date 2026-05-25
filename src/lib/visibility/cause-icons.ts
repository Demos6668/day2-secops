/**
 * Icon pairing for visibility cause flags. Keeps cause taxonomy data
 * (causes.ts) decoupled from UI icon imports so the score lib stays pure.
 */

import {
  PlugZap,
  Antenna,
  Layers,
  ShieldOff,
  Network,
  Clock4,
  CircleSlash2,
  Ghost,
  type LucideIcon,
} from "lucide-react";
import type { VisibilityCauseFlag } from "@/types/tool";

export const CAUSE_ICONS: Record<VisibilityCauseFlag, LucideIcon> = {
  agent_absent: PlugZap,
  agent_silent: Antenna,
  coverage_gap: Layers,
  policy_drift: ShieldOff,
  telemetry_blocked: Network,
  stale_data: Clock4,
  eol_unsupported: CircleSlash2,
  decommission_ghost: Ghost,
};
