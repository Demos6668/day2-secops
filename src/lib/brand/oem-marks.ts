/**
 * OEM brand marks — small colored chips with vendor initials.
 *
 * v1 does NOT ship real OEM logos (copyright + bundle weight). Instead we
 * render a colored chip with the vendor's known brand color and 1-3 letter
 * initials — the pattern used by Linear, Notion, and most B2B dashboards for
 * missing brand marks. The colors are pulled from each vendor's public press
 * kit / marketing site to stay recognizable at a glance.
 *
 * To swap in real SVG marks later: add an `svg` field per entry; OemMark
 * renders the SVG when present and falls back to initials otherwise.
 */

export interface OemMarkDef {
  /** Vendor brand color (background of the chip). */
  color: string;
  /** Foreground text color — picked for contrast on the brand background. */
  textColor?: string;
  /** 1-3 letter initials displayed inside the chip. */
  initials: string;
}

const DEFAULT: OemMarkDef = { color: "#475569", textColor: "#FFFFFF", initials: "??" };

const MARKS: Record<string, OemMarkDef> = {
  // ABCL workspace OEMs
  CyberArk: { color: "#FF0033", textColor: "#FFFFFF", initials: "CA" },
  "Indusface AppTrana": { color: "#FF6B00", textColor: "#FFFFFF", initials: "IA" },
  "Imperva WAF": { color: "#1F4E8C", textColor: "#FFFFFF", initials: "IM" },
  TrendMicro: { color: "#D71921", textColor: "#FFFFFF", initials: "TM" },
  GlobalScape: { color: "#003E7E", textColor: "#FFFFFF", initials: "GS" },
  TCPWAVE: { color: "#0066CC", textColor: "#FFFFFF", initials: "TW" },
  Trellix: { color: "#C8102E", textColor: "#FFFFFF", initials: "TX" },
  Forcepoint: { color: "#00529C", textColor: "#FFFFFF", initials: "FP" },
  SentinelOne: { color: "#6B0AEA", textColor: "#FFFFFF", initials: "S1" },
  Guardicore: { color: "#0099CC", textColor: "#FFFFFF", initials: "GC" },
  Forescout: { color: "#00B388", textColor: "#0B1220", initials: "FS" },
  Fortinet: { color: "#EE3124", textColor: "#FFFFFF", initials: "FN" },
  // Demo workspace OEMs
  Okta: { color: "#007DC1", textColor: "#FFFFFF", initials: "OK" },
  Cloudflare: { color: "#F38020", textColor: "#0B1220", initials: "CF" },
  CrowdStrike: { color: "#FA2A23", textColor: "#FFFFFF", initials: "CS" },
  Symantec: { color: "#FCC900", textColor: "#0B1220", initials: "SY" },
  "Cisco ISE": { color: "#00BCEB", textColor: "#0B1220", initials: "CI" },
};

export function getOemMark(oem: string): OemMarkDef {
  if (MARKS[oem]) return MARKS[oem];
  // Try a forgiving lookup — first word only.
  const head = oem.split(/\s+/)[0];
  if (MARKS[head]) return MARKS[head];
  // Fallback: deterministic hash → color, initials from words.
  let h = 0;
  for (let i = 0; i < oem.length; i++) h = (h * 31 + oem.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const initials = oem
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return {
    ...DEFAULT,
    color: `hsl(${hue} 60% 40%)`,
    initials: initials || DEFAULT.initials,
  };
}
