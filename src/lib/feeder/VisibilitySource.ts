/**
 * Visibility source contract.
 *
 * The dashboard does NOT care whether a tool's coverage data came from a
 * mock generator, a webhook receiver, an OEM API, or a CSV ingestion. Each
 * source implements this interface and the FeederProvider drives them on
 * a tick.
 *
 * Per the brief, every feeder source must be abstracted behind this
 * interface so the seam is obvious when real integrations land.
 */

import type { Tool, ToolSeed, VisibilityCauseFlag } from "@/types/tool";

/** Fields a source is allowed to update on each tick. */
export interface VisibilityUpdate {
  toolId: string;
  /** Absolute new observed count, or null to leave alone. */
  observed?: number | null;
  /** ISO-8601 string for last-sync timestamp, or null to leave alone. */
  lastSync?: string | null;
  /** Replace the active cause flag set, or null to leave alone. */
  causes?: VisibilityCauseFlag[] | null;
  /** Optional human-readable note (used for toasts). */
  note?: string;
}

export interface VisibilitySource {
  /** Stable name shown in score-breakdown source attribution. */
  name: string;
  /** True if this source owns the given tool. */
  owns(seed: ToolSeed): boolean;
  /**
   * Produce zero or more updates for tools this source owns. The provider
   * calls this once per tick (3-7s in mock, longer in production).
   */
  fetch(seeds: ToolSeed[], priorState: ReadonlyMap<string, Tool>): Promise<VisibilityUpdate[]>;
}
