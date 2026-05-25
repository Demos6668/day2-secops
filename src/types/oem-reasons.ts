import { z } from "zod";

/**
 * OEM-native inventory-loss reasons.
 *
 * Each entry is the kind of finding you'd pull from the vendor's own admin
 * console — e.g. CrowdStrike RFM (Reduced Functionality Mode), CyberArk
 * "factor not enrolled", Fortinet HA desync. `consolePath` describes where
 * an operator would land in the native UI to investigate.
 */
export const OemLossReasonSeveritySchema = z.enum(["Critical", "High", "Medium", "Low"]);

export const OemLossReasonSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  consolePath: z.string().min(1),
  severity: OemLossReasonSeveritySchema,
});

export const OemReasonsFileSchema = z.object({
  // Map OEM display name → list of reason entries. Display name matches
  // `Tool.oem` exactly so we can look up via t.oem.
  reasonsByOem: z.record(z.string(), z.array(OemLossReasonSchema)),
});

export type OemLossReasonSeverity = z.infer<typeof OemLossReasonSeveritySchema>;
export type OemLossReason = z.infer<typeof OemLossReasonSchema>;
export type OemReasonsFile = z.infer<typeof OemReasonsFileSchema>;
