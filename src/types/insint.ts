import { z } from "zod";

export const InsintFindingsSchema = z.object({
  critical: z.number().int().nonnegative(),
  high: z.number().int().nonnegative(),
  medium: z.number().int().nonnegative(),
  low: z.number().int().nonnegative(),
  info: z.number().int().nonnegative(),
});

export const InsintSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.string().min(1),
  lastScan: z.string().min(1),
  scope: z.string().min(1),
  hostsScanned: z.number().int().nonnegative(),
  findings: InsintFindingsSchema,
});

export const InsintCveSeveritySchema = z.enum(["Critical", "High", "Medium", "Low"]);

export const InsintCveSchema = z.object({
  cve: z.string().min(1),
  title: z.string().min(1),
  severity: InsintCveSeveritySchema,
  affectedHosts: z.number().int().nonnegative(),
});

export const InsintAgentGroupSchema = z.object({
  name: z.string().min(1),
  hostCount: z.number().int().nonnegative(),
  compliancePct: z.number().min(0).max(100),
  lastSync: z.string().min(1),
});

export const InsintFileSchema = z.object({
  sources: z.array(InsintSourceSchema),
  topCves: z.array(InsintCveSchema),
  agentGroups: z.array(InsintAgentGroupSchema),
});

export type InsintSource = z.infer<typeof InsintSourceSchema>;
export type InsintCve = z.infer<typeof InsintCveSchema>;
export type InsintAgentGroup = z.infer<typeof InsintAgentGroupSchema>;
export type InsintFile = z.infer<typeof InsintFileSchema>;
