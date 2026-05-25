import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Constant-time HMAC verification.
 *
 *   Header format: X-Day2-Signature: sha256=<hex>
 *   Body is the raw request body — middleware MUST preserve req.rawBody.
 */
export function verifySignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const match = /^sha256=([0-9a-f]{64})$/i.exec(signatureHeader.trim());
  if (!match) return false;
  const provided = Buffer.from(match[1], "hex");
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export function sign(rawBody: Buffer | string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
}
