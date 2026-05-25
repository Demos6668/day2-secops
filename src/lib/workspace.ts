/**
 * Workspace config loader.
 *
 * v1 ships static JSON imports (build-time). When we add per-environment
 * configs in Phase 4, swap the inner loader for `fetch('/workspaces/<id>.json')`
 * — the public hook surface stays the same.
 */

import { useMemo } from "react";
import {
  FrameworksFileSchema,
  ToolsFileSchema,
  WorkspaceConfigSchema,
  type Framework,
  type ToolSeed,
  type WorkspaceConfig,
} from "@/types/tool";
import { useOverlaySeeds } from "@/lib/workspace-overlay";

import abclConfigRaw from "../../workspaces/abcl.json";
import abclToolsRaw from "../../workspaces/abcl/tools.json";
import abclFrameworksRaw from "../../workspaces/abcl/frameworks.json";
import demoConfigRaw from "../../workspaces/demo.json";
import demoToolsRaw from "../../workspaces/demo/tools.json";
import demoFrameworksRaw from "../../workspaces/demo/frameworks.json";

const REGISTRY: Record<string, { config: unknown; tools: unknown; frameworks: unknown }> = {
  abcl: {
    config: abclConfigRaw,
    tools: abclToolsRaw,
    frameworks: abclFrameworksRaw,
  },
  demo: {
    config: demoConfigRaw,
    tools: demoToolsRaw,
    frameworks: demoFrameworksRaw,
  },
};

const DEFAULT_WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_ID ?? "abcl";

export interface LoadedWorkspace {
  config: WorkspaceConfig;
  toolSeeds: ToolSeed[];
  categoryRelations: {
    from: string;
    to: string;
    kind: "same-category" | "adjacent";
    label: string;
  }[];
  frameworks: Framework[];
}

export function loadWorkspace(id: string = DEFAULT_WORKSPACE_ID): LoadedWorkspace {
  const entry = REGISTRY[id];
  if (!entry) {
    throw new Error(`Unknown workspace "${id}". Known: ${Object.keys(REGISTRY).join(", ")}`);
  }
  const config = WorkspaceConfigSchema.parse(entry.config);
  const toolsFile = ToolsFileSchema.parse(entry.tools);
  const frameworksFile = FrameworksFileSchema.parse(entry.frameworks);
  return {
    config,
    toolSeeds: toolsFile.tools,
    categoryRelations: toolsFile.categoryRelations,
    frameworks: frameworksFile.frameworks,
  };
}

export function useWorkspace(id?: string): LoadedWorkspace {
  const overlay = useOverlaySeeds();
  // Memoized: parsing zod schemas every render is cheap but pointless.
  return useMemo(() => {
    const base = loadWorkspace(id ?? DEFAULT_WORKSPACE_ID);
    if (overlay.length === 0) return base;
    return { ...base, toolSeeds: [...base.toolSeeds, ...overlay] };
  }, [id, overlay]);
}

export function listWorkspaces(): { id: string; name: string }[] {
  return Object.keys(REGISTRY).map((id) => {
    const cfg = WorkspaceConfigSchema.parse(REGISTRY[id].config);
    return { id: cfg.id, name: cfg.name };
  });
}
