import { z } from "zod";

export const SeveritySchema = z.enum(["Critical", "Moderate", "Low"]);
export type Severity = z.infer<typeof SeveritySchema>;

// Five towers — the canonical security-function partitioning ABCL operates by.
export const TowerSchema = z.enum([
  "Endpoint Security",
  "Application Security",
  "Network Security",
  "Data Security",
  "Identity Security",
]);
export type Tower = z.infer<typeof TowerSchema>;

export const RagStatusSchema = z.enum(["green", "amber", "red"]);
export type RagStatus = z.infer<typeof RagStatusSchema>;

export const MockProfileSchema = z.enum(["healthy", "degraded", "flapping", "stale"]);
export type MockProfile = z.infer<typeof MockProfileSchema>;

export const VisibilityCauseFlagSchema = z.enum([
  "agent_absent",
  "agent_silent",
  "coverage_gap",
  "policy_drift",
  "telemetry_blocked",
  "stale_data",
  "eol_unsupported",
  "decommission_ghost",
]);
export type VisibilityCauseFlag = z.infer<typeof VisibilityCauseFlagSchema>;

export const ToolSeedSchema = z.object({
  id: z.string().min(1),
  severity: SeveritySchema,
  tower: TowerSchema,
  solution: z.string().min(1),
  oem: z.string().min(1),
  hosting: z.string().min(1),
  denominator: z.number().int().positive(),
  denominatorUnit: z.string().optional(),
  denominatorRange: z
    .object({ min: z.number().int().positive(), max: z.number().int().positive() })
    .optional(),
  secondaryDenominator: z
    .object({ value: z.number().int().positive(), unit: z.string() })
    .optional(),
  mockProfile: MockProfileSchema.default("healthy"),
  category: z.string().optional(),
  freshnessSloHoursOverride: z.number().positive().optional(),
});
export type ToolSeed = z.infer<typeof ToolSeedSchema>;

export const ToolSchema = ToolSeedSchema.extend({
  observed: z.number().int().nonnegative(),
  lastSync: z.string().datetime(),
  causes: z.array(VisibilityCauseFlagSchema),
  /** OEM-native loss-reason codes (resolved against the workspace's reason catalog). */
  activeLossReasons: z.array(z.string()).default([]),
  status: RagStatusSchema,
  score: z.number(),
});
export type Tool = z.infer<typeof ToolSchema>;

export const ToolsFileSchema = z.object({
  $schema: z.string().optional(),
  tools: z.array(ToolSeedSchema),
  categoryRelations: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        kind: z.enum(["same-category", "adjacent"]),
        label: z.string(),
      }),
    )
    .default([]),
});
export type ToolsFile = z.infer<typeof ToolsFileSchema>;

// Freshness SLO keys mirror tower slugs — one entry per tower.
export const FreshnessSloSchema = z.object({
  endpoint: z.number().default(24),
  application: z.number().default(12),
  network: z.number().default(12),
  data: z.number().default(12),
  identity: z.number().default(6),
});
export type FreshnessSlo = z.infer<typeof FreshnessSloSchema>;

export const WorkspaceConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  logoSlot: z.string().optional(),
  watermark: z.string().optional(),
  denominators: z.record(z.string(), z.number().int().positive()).default({}),
  freshnessSloHours: FreshnessSloSchema.default({
    endpoint: 24,
    application: 12,
    network: 12,
    data: 12,
    identity: 6,
  }),
  snapshotRetentionDays: z.number().int().positive().default(90),
  files: z.object({
    tools: z.string(),
    frameworks: z.string(),
    assets: z.string(),
  }),
});
export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;

export const FrameworkControlSchema = z.object({
  id: z.string(),
  title: z.string(),
  anchorTools: z.array(z.string()).default([]),
});
export type FrameworkControl = z.infer<typeof FrameworkControlSchema>;

export const FrameworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  controls: z.array(FrameworkControlSchema),
});
export type Framework = z.infer<typeof FrameworkSchema>;

export const FrameworksFileSchema = z.object({
  frameworks: z.array(FrameworkSchema),
});
export type FrameworksFile = z.infer<typeof FrameworksFileSchema>;

/** Maps a Tower to its freshness-SLO key on WorkspaceConfig.freshnessSloHours. */
export const TOWER_FRESHNESS_KEY: Record<Tower, keyof FreshnessSlo> = {
  "Endpoint Security": "endpoint",
  "Application Security": "application",
  "Network Security": "network",
  "Data Security": "data",
  "Identity Security": "identity",
};
