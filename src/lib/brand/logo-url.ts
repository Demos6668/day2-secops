/**
 * Resolve a brand logo URL for an OEM.
 *
 * Strategy (best-fit chain):
 *   1. Local hand-curated SVG at `public/images/oems/<slug>.svg` if present
 *      (graceful 404 lets us fall through to the next candidate).
 *   2. logo.dev public API — `https://img.logo.dev/<domain>?token=<key>&size=128`
 *      (free tier, ~16 KB per logo, CORS-permissive, cached by browser).
 *   3. Caller renders the geometric glyph fallback (`oem-glyphs.tsx`)
 *      then the monogram (`oem-marks.ts`). See OemMark.tsx for the chain.
 *
 * Why logo.dev: logo.clearbit.com lost public DNS in 2024 after HubSpot
 * acquired Clearbit. logo.dev returned HTTP 200 with usable PNG for every
 * vendor domain in our workspace at verification time.
 *
 * The token below is the publishable key from logo.dev's own docs — it
 * ships in the bundle by design (same model as Stripe's publishable keys).
 * Rate limits are generous enough for demo traffic. To use your own quota,
 * set `VITE_LOGO_DEV_TOKEN` in `.env`.
 */

import { domainFor, oemSlug } from "./oem-domains";

const LOCAL_OEMS_BASE = "/images/oems";
const LOGO_DEV_BASE = "https://img.logo.dev";
const DEFAULT_PUBLISHABLE_TOKEN = "pk_X-1ZO13GSgeOoUrIuJ6GMQ";

function logoDevToken(): string {
  const fromEnv = (import.meta.env as Record<string, string | undefined>).VITE_LOGO_DEV_TOKEN;
  return fromEnv?.trim() || DEFAULT_PUBLISHABLE_TOKEN;
}

/**
 * Candidate URL list, walked by `<img onError>` to fall back cleanly when
 * an upstream is missing.
 */
export function getLogoCandidates(oem: string, sizePx = 128): string[] {
  const candidates: string[] = [];
  const slug = oemSlug(oem);
  candidates.push(`${LOCAL_OEMS_BASE}/${slug}.svg`);
  const domain = domainFor(oem);
  if (domain) {
    const token = logoDevToken();
    candidates.push(
      `${LOGO_DEV_BASE}/${domain}?token=${encodeURIComponent(token)}&size=${sizePx}&format=png`,
    );
  }
  return candidates;
}
