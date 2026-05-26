import { z } from "zod";

/**
 * Cross-framework control correlations.
 *
 * Controls in different frameworks often cover the same intent (e.g.,
 * MFA enrollment, network segmentation, disk encryption). A correlation
 * entry groups every framework-control that an auditor would consider
 * equivalent — so closing one is evidence toward closing the others.
 *
 * Keys are stable correlation IDs (e.g., `corr-asset-inventory`,
 * `corr-mfa`); the `controls` array names framework-qualified control
 * ids ("iso27001-2022/A.5.9", "nist-csf-2.0/ID.AM-01").
 */
export const ControlRefSchema = z.string().regex(/^[a-z0-9._-]+\/.+$/i, {
  message: "expected <frameworkId>/<controlId>",
});

export const ControlCorrelationSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  description: z.string().min(1),
  controls: z.array(ControlRefSchema).min(2),
});

export const ControlCorrelationsFileSchema = z.object({
  correlations: z.array(ControlCorrelationSchema),
});

export type ControlRef = z.infer<typeof ControlRefSchema>;
export type ControlCorrelation = z.infer<typeof ControlCorrelationSchema>;
export type ControlCorrelationsFile = z.infer<typeof ControlCorrelationsFileSchema>;

export function parseControlRef(ref: ControlRef): { frameworkId: string; controlId: string } {
  const idx = ref.indexOf("/");
  return { frameworkId: ref.slice(0, idx), controlId: ref.slice(idx + 1) };
}
