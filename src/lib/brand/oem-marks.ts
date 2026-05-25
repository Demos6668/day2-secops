/**
 * OEM brand-mark fallback chips.
 *
 * Each entry is a small colored chip with the vendor's known brand color and
 * 1-3 letter initials — used by `OemMark` when no remote logo and no local
 * `public/images/oems/<slug>.svg` are available.
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
  Vi: { color: "#ED1C24", textColor: "#FFFFFF", initials: "Vi" },
  "Vodafone Idea": { color: "#ED1C24", textColor: "#FFFFFF", initials: "Vi" },
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
