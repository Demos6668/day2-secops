/**
 * Bidirectional graph resolvers.
 *
 * Single source of truth for "given X, find related Y" queries used by every
 * cross-link, hover-card, and detail page. All pure functions over a Tool[]
 * + Framework[] + categoryRelations[]. No I/O, no React.
 */

import type { Framework, FrameworkControl, Tool, VisibilityCauseFlag } from "@/types/tool";

export interface CategoryRelation {
  from: string;
  to: string;
  kind: "same-category" | "adjacent";
  label: string;
}

export function toolById(tools: Tool[], id: string): Tool | undefined {
  return tools.find((t) => t.id === id);
}

export function toolsWithCause(tools: Tool[], flag: VisibilityCauseFlag): Tool[] {
  return tools.filter((t) => t.causes.includes(flag));
}

export function causeFlagCounts(tools: Tool[]): Record<VisibilityCauseFlag, number> {
  const acc = {} as Record<VisibilityCauseFlag, number>;
  for (const t of tools) {
    for (const c of t.causes) {
      acc[c] = (acc[c] ?? 0) + 1;
    }
  }
  return acc;
}

export function toolsByOem(tools: Tool[], oem: string): Tool[] {
  return tools.filter((t) => t.oem === oem);
}

export function uniqueOems(tools: Tool[]): string[] {
  return Array.from(new Set(tools.map((t) => t.oem))).sort();
}

export function findControl(
  frameworks: Framework[],
  frameworkId: string,
  controlId: string,
): { framework: Framework; control: FrameworkControl } | undefined {
  const fw = frameworks.find((f) => f.id === frameworkId);
  if (!fw) return undefined;
  const ctrl = fw.controls.find((c) => c.id === controlId);
  if (!ctrl) return undefined;
  return { framework: fw, control: ctrl };
}

export function toolsCovering(tools: Tool[], control: FrameworkControl): Tool[] {
  const ids = new Set(control.anchorTools);
  return tools.filter((t) => ids.has(t.id));
}

export function controlsAnchoredBy(
  frameworks: Framework[],
  toolId: string,
): { framework: Framework; control: FrameworkControl }[] {
  const out: { framework: Framework; control: FrameworkControl }[] = [];
  for (const fw of frameworks) {
    for (const c of fw.controls) {
      if (c.anchorTools.includes(toolId)) out.push({ framework: fw, control: c });
    }
  }
  return out;
}

export function frameworksMentioningCause(
  _frameworks: Framework[],
  flag: VisibilityCauseFlag,
): Array<{ frameworkId: string; controlId: string; note: string }> {
  // The RAG_MODEL.md table is the source of truth here, but it's documentation,
  // not data. v1 returns an empty list — Phase-real grants this its own map.
  // Returning [] keeps the cause-detail page honest about what we know.
  void flag;
  return [];
}

export function relatedToolsByCategory(
  tools: Tool[],
  relations: CategoryRelation[],
  toolId: string,
): { tool: Tool; via: string }[] {
  const self = toolById(tools, toolId);
  if (!self || !self.category) return [];
  const out: { tool: Tool; via: string }[] = [];
  const seen = new Set<string>([toolId]);

  // Same category
  for (const t of tools) {
    if (t.id === toolId) continue;
    if (t.category && t.category === self.category && !seen.has(t.id)) {
      out.push({ tool: t, via: "Same category" });
      seen.add(t.id);
    }
  }

  // Explicit relations
  for (const rel of relations) {
    const matchesFrom = rel.from === self.category;
    const matchesTo = rel.to === self.category;
    if (!matchesFrom && !matchesTo) continue;
    const targetCategory = matchesFrom ? rel.to : rel.from;
    for (const t of tools) {
      if (t.id === toolId) continue;
      if (t.category === targetCategory && !seen.has(t.id)) {
        out.push({ tool: t, via: rel.label });
        seen.add(t.id);
      }
    }
  }

  return out;
}

export interface OemRollup {
  oem: string;
  tools: Tool[];
  visibilityPct: number;
  redCount: number;
  amberCount: number;
  greenCount: number;
}

export function oemRollup(tools: Tool[], oem: string): OemRollup {
  const inOem = toolsByOem(tools, oem);
  const denom = inOem.reduce((a, t) => a + t.denominator, 0);
  const observed = inOem.reduce((a, t) => a + t.observed, 0);
  return {
    oem,
    tools: inOem,
    visibilityPct: denom > 0 ? observed / denom : 0,
    redCount: inOem.filter((t) => t.status === "red").length,
    amberCount: inOem.filter((t) => t.status === "amber").length,
    greenCount: inOem.filter((t) => t.status === "green").length,
  };
}
