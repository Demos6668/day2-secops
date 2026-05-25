/**
 * Derive related-tool edges for the Feasibility graph.
 *
 * Edges come from two sources:
 *   1. Explicit `categoryRelations` in workspaces/<id>/tools.json
 *      e.g. { from: "waf", to: "waf", kind: "same-category" }
 *      Connects every pair of tools whose `category` matches.
 *   2. Same-category fallback: any two tools sharing the same `category`
 *      string get a same-category edge, even if no explicit rule exists.
 */

import type { Tool, ToolSeed } from "@/types/tool";

export interface CategoryRelation {
  from: string;
  to: string;
  kind: "same-category" | "adjacent";
  label: string;
}

export interface ToolEdge {
  source: string;
  target: string;
  kind: "same-category" | "adjacent";
  label: string;
}

export function buildEdges(
  tools: Pick<Tool, "id" | "category">[],
  relations: CategoryRelation[],
): ToolEdge[] {
  const byCategory = new Map<string, string[]>();
  for (const t of tools) {
    if (!t.category) continue;
    const list = byCategory.get(t.category) ?? [];
    list.push(t.id);
    byCategory.set(t.category, list);
  }

  const edges: ToolEdge[] = [];
  const seen = new Set<string>();
  const addEdge = (a: string, b: string, kind: ToolEdge["kind"], label: string) => {
    if (a === b) return;
    const key = a < b ? `${a}|${b}|${kind}` : `${b}|${a}|${kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source: a, target: b, kind, label });
  };

  // (1) Same-category fallback — any two tools sharing a category.
  for (const ids of byCategory.values()) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        addEdge(ids[i], ids[j], "same-category", "Same category");
      }
    }
  }

  // (2) Explicit relations between categories.
  for (const rel of relations) {
    const a = byCategory.get(rel.from) ?? [];
    const b = byCategory.get(rel.to) ?? [];
    for (const x of a) {
      for (const y of b) addEdge(x, y, rel.kind, rel.label);
    }
  }

  return edges;
}

/** Convenience used by tests / non-feeder callers. */
export function buildEdgesFromSeeds(seeds: ToolSeed[], relations: CategoryRelation[]): ToolEdge[] {
  return buildEdges(seeds, relations);
}
