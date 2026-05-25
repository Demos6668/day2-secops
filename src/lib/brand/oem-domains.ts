/**
 * OEM → marketing domain map.
 *
 * Used by `getLogoUrl()` to resolve a runtime logo via the Clearbit Logo API.
 * When a vendor has been acquired, we point to the acquirer's domain so the
 * logo stays current with how the brand is presented today.
 */

export const OEM_DOMAIN: Record<string, string> = {
  // ABCL workspace
  CyberArk: "cyberark.com",
  "Indusface AppTrana": "indusface.com",
  "Imperva WAF": "imperva.com",
  TrendMicro: "trendmicro.com",
  GlobalScape: "globalscape.com",
  TCPWAVE: "tcpwave.com",
  Trellix: "trellix.com",
  Forcepoint: "forcepoint.com",
  SentinelOne: "sentinelone.com",
  Guardicore: "akamai.com", // acquired by Akamai
  Forescout: "forescout.com",
  Fortinet: "www.fortinet.com", // logo.dev returns 404 on the bare apex; www works.
  "Palo Alto": "paloaltonetworks.com",
  F5: "f5.com",
  Radware: "radware.com",
  "Check Point": "checkpoint.com",
  Vi: "myvi.in",
  "Vodafone Idea": "myvi.in",
};

export function domainFor(oem: string): string | undefined {
  if (OEM_DOMAIN[oem]) return OEM_DOMAIN[oem];
  const head = oem.split(/\s+/)[0];
  return OEM_DOMAIN[head];
}

/** Slug suitable for `public/images/oems/<slug>.svg` local cache files. */
export function oemSlug(oem: string): string {
  return oem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
