import { z } from "zod";

/**
 * Per-tool operational telemetry catalog.
 *
 * Mirrors the SecOps Structural Architecture framework matrix:
 *   - which telemetry vectors a tool exposes (SNMPv3 / REST / Syslog / etc.)
 *   - the specific endpoints (MIB OIDs, API paths, log files, log IDs)
 *   - the red-flag alert threshold ops engineering should wire
 *   - the day-to-day administrative change points operators touch
 *
 * Lookups via tool id; absent entries render nothing (additive layer).
 */
export const CollectionVectorSchema = z.enum([
  "SNMPv3",
  "REST API",
  "Syslog",
  "Webhook",
  "File-tail",
  "Database",
  "Windows Event Log",
  "Agent",
]);
export type CollectionVector = z.infer<typeof CollectionVectorSchema>;

export const TelemetryEndpointSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  kind: z.enum(["OID", "API", "Log", "Metric"]).optional(),
});
export type TelemetryEndpoint = z.infer<typeof TelemetryEndpointSchema>;

export const ToolOperationsSchema = z.object({
  toolId: z.string().min(1),
  collectionVectors: z.array(CollectionVectorSchema).min(1),
  telemetryEndpoints: z.array(TelemetryEndpointSchema).default([]),
  criticalAlertThreshold: z.string().min(1),
  dailyChangePoints: z.array(z.string().min(1)).default([]),
});
export type ToolOperations = z.infer<typeof ToolOperationsSchema>;

export const OperationsFileSchema = z.object({
  operations: z.array(ToolOperationsSchema),
});
export type OperationsFile = z.infer<typeof OperationsFileSchema>;
