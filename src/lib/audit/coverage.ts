/**
 * Audit coverage computation.
 *
 * For each (framework × control × tool) cell, decide whether the tool
 * "covers" the control. v1 derives this from:
 *   1. The framework JSON anchor list — control says "MFA covers A.5.15".
 *   2. The tool's current RAG status — a covered control whose anchor
 *      tool is RED is downgraded to "partial".
 *
 * Phase-real: replace with an audit-team-curated mapping per workspace.
 */

import type { Framework, FrameworkControl, Tool } from "@/types/tool";

export type CellStatus = "covered" | "partial" | "gap" | "na";

export interface CellMeta {
  status: CellStatus;
  /** Tool ID if the cell is occupied. */
  toolId?: string;
  /** Why the cell ended up at this status (shown in tooltip). */
  rationale: string;
}

export function cellFor(control: FrameworkControl, tool: Tool): CellMeta {
  const anchored = control.anchorTools.includes(tool.id);
  if (!anchored) {
    return { status: "na", rationale: "Tool not anchored to this control." };
  }
  if (tool.status === "red") {
    return {
      status: "partial",
      toolId: tool.id,
      rationale: `${tool.solution} anchors this control but is currently RED (score ${tool.score.toFixed(0)}).`,
    };
  }
  if (tool.status === "amber") {
    return {
      status: "partial",
      toolId: tool.id,
      rationale: `${tool.solution} anchors this control with degraded visibility.`,
    };
  }
  return {
    status: "covered",
    toolId: tool.id,
    rationale: `${tool.solution} covers this control with healthy visibility.`,
  };
}

export interface ControlCoverage {
  control: FrameworkControl;
  cells: CellMeta[];
  /** Roll-up: how many anchored tools are healthy. */
  health: { covered: number; partial: number; gap: number };
  overall: CellStatus;
}

export function rollupControl(control: FrameworkControl, tools: Tool[]): ControlCoverage {
  const cells = tools.map((t) => cellFor(control, t));
  const occupied = cells.filter((c) => c.status !== "na");
  const covered = occupied.filter((c) => c.status === "covered").length;
  const partial = occupied.filter((c) => c.status === "partial").length;
  const gap = occupied.filter((c) => c.status === "gap").length;
  let overall: CellStatus;
  if (control.anchorTools.length === 0) overall = "gap";
  else if (partial === 0 && gap === 0 && covered > 0) overall = "covered";
  else if (covered === 0 && partial === 0) overall = "gap";
  else overall = "partial";
  return {
    control,
    cells,
    health: { covered, partial, gap },
    overall,
  };
}

export interface FrameworkCoverage {
  framework: Framework;
  controls: ControlCoverage[];
  totals: { covered: number; partial: number; gap: number; total: number };
}

export function rollupFramework(framework: Framework, tools: Tool[]): FrameworkCoverage {
  const controls = framework.controls.map((c) => rollupControl(c, tools));
  const totals = controls.reduce(
    (acc, c) => {
      acc[c.overall === "na" ? "gap" : c.overall] += 1;
      acc.total += 1;
      return acc;
    },
    { covered: 0, partial: 0, gap: 0, total: 0 },
  );
  return { framework, controls, totals };
}
