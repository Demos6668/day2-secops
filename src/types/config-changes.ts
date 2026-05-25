import { z } from "zod";

export const ConfigChangeRiskSchema = z.enum(["safe", "risky", "dangerous"]);
export const ConfigChangeStatusSchema = z.enum(["pending_review", "deployed", "rolled_back"]);

export const ConfigChangeSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().datetime(),
  toolId: z.string().min(1),
  actor: z.string().min(1),
  ticket: z.string().optional(),
  type: z.string().min(1),
  summary: z.string().min(1),
  riskClass: ConfigChangeRiskSchema,
  riskReasons: z.array(z.string()).default([]),
  status: ConfigChangeStatusSchema,
  diff: z.string().optional(),
});

export const ConfigChangesFileSchema = z.object({
  changes: z.array(ConfigChangeSchema),
});

export type ConfigChangeRisk = z.infer<typeof ConfigChangeRiskSchema>;
export type ConfigChangeStatus = z.infer<typeof ConfigChangeStatusSchema>;
export type ConfigChange = z.infer<typeof ConfigChangeSchema>;
export type ConfigChangesFile = z.infer<typeof ConfigChangesFileSchema>;
