/**
 * Day2 SecOps visual system tokens.
 *
 * Aligned to a Linear-airy density baseline with a stronger Day2 brand
 * signature (teal #0095AF + Day-2 orange #FF3C00 used as accents on the
 * mark, never as a primary surface). All values live as CSS variables so
 * components stay token-driven and the comfortable↔compact toggle works
 * by swapping the var values, not by re-rendering components.
 */

/** Linear-style modular spacing scale, in px. */
export const SPACE = {
  px: 1,
  half: 2,
  "1": 4,
  "2": 8,
  "3": 12,
  "4": 16,
  "5": 20,
  "6": 24,
  "8": 32,
  "10": 40,
  "12": 48,
  "16": 64,
  "20": 80,
} as const;

/** Typographic ramp. Numbers are rem-equivalent shorthands. */
export const TYPE = {
  display: { size: "1.75rem", lineHeight: 1.15, weight: 700, tracking: "-0.01em" },
  h1: { size: "1.5rem", lineHeight: 1.2, weight: 700, tracking: "-0.005em" },
  h2: { size: "1.125rem", lineHeight: 1.3, weight: 600 },
  h3: { size: "0.9375rem", lineHeight: 1.35, weight: 600 },
  body: { size: "0.875rem", lineHeight: 1.5, weight: 400 },
  small: { size: "0.8125rem", lineHeight: 1.45, weight: 400 },
  meta: { size: "0.6875rem", lineHeight: 1.4, weight: 500, tracking: "0.08em" },
  num: { family: "Fira Code, monospace", variantNumeric: "tabular-nums" },
} as const;

/** Surface elevation tokens — match index.css CSS vars. */
export const SURFACE = {
  canvas: "var(--background)",
  panel: "var(--card)",
  raised: "var(--surface-raised)",
  popover: "var(--popover)",
} as const;

/** Motion budget — Linear-strict, reduced for accessibility. */
export const MOTION = {
  durationFast: "120ms",
  durationStandard: "200ms",
  durationSlow: "320ms",
  ease: "cubic-bezier(0.2, 0.0, 0.0, 1.0)",
  // Animations that may run without explicit user trigger (RAG flips, sparkline).
  ambient: true,
  // Anything decorative — disabled unless user opts in.
  decorative: false,
} as const;

/** Day2 SecOps brand seal — teal primary + orange day2 accent. */
export const BRAND = {
  primary: "#0095AF",
  primaryLight: "#00B8D4",
  primaryDeep: "#007391",
  accent: "#FF3C00",
  accentDim: "#FF6633",
  /** Linear gradient applied as a 2px stripe at the top of the sidebar / header. */
  signatureStripe: "linear-gradient(90deg, #0095AF 0%, #00B8D4 45%, #FF6633 78%, #FF3C00 100%)",
} as const;

export type Density = "comfortable" | "compact";

/** Pre-computed density tokens — applied as data-density="..." on body. */
export const DENSITY: Record<
  Density,
  { rowPaddingY: number; cardPadding: number; tileGap: number; baseFontPx: number }
> = {
  comfortable: { rowPaddingY: 10, cardPadding: 20, tileGap: 14, baseFontPx: 14 },
  compact: { rowPaddingY: 6, cardPadding: 14, tileGap: 10, baseFontPx: 13 },
};
