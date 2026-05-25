/**
 * Hand-curated geometric marks for each OEM, rendered as inline SVG paths.
 *
 * These are intentionally NOT vendor logos (which would create trademark
 * risk for a third-party tool) — each glyph is a distinctive geometric
 * abstraction in the vendor's brand color, designed to be recognizable
 * AT A GLANCE at 20-56px without depending on letters or colors alone.
 *
 * Every glyph fills a 24x24 viewBox, centered, monochrome on white. The
 * surrounding OemMark renders the colored tile and the glyph on top.
 */

import type { JSX, SVGProps } from "react";

type GlyphProps = SVGProps<SVGSVGElement>;
type Glyph = (props: GlyphProps) => JSX.Element;

// Each glyph is a function so consumers can pass color/size props through.
const Glyphs: Record<string, Glyph> = {
  // Identity & access — key, ring, lock motifs
  CyberArk: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="9" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M13 12h7M17 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Okta: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  ),

  // Web application firewalls — shield + perimeter motifs
  "Indusface AppTrana": (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
  "Imperva WAF": (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M4 7l8-4 8 4v6c0 4-3 7-8 8-5-1-8-4-8-8V7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8 11h8M8 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Cloudflare: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M6 16h11a3 3 0 1 0-.5-5.96A5 5 0 1 0 8 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  ),

  // Endpoint — agent / scanner motifs
  TrendMicro: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 3l9 16H3l9-16z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="14" r="2" fill="currentColor" />
    </svg>
  ),
  Trellix: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M12 2l5 5-5 5-5-5 5-5zM12 12l5 5-5 5-5-5 5-5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Forcepoint: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  SentinelOne: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  ),
  CrowdStrike: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M4 14c2-2 5-3 8-3s6 1 8 3M6 10c2-2 4-3 6-3s4 1 6 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  ),
  Symantec: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12l2.5 2.5L16 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),

  // Data / file motion — arrows, waves, server
  GlobalScape: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="4" y="5" width="16" height="5" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="4" y="14" width="16" height="5" rx="1" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="7.5" r="1" fill="currentColor" />
      <circle cx="8" cy="16.5" r="1" fill="currentColor" />
      <path
        d="M15 10v4M13 12.5l2 1.5 2-1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  TCPWAVE: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="3" cy="12" r="1.5" fill="currentColor" />
      <circle cx="21" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),

  // Network — segmentation / NAC
  Guardicore: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="3" y="6" width="6" height="6" stroke="currentColor" strokeWidth="2" />
      <rect x="15" y="6" width="6" height="6" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="6" height="6" stroke="currentColor" strokeWidth="2" />
      <rect x="15" y="14" width="6" height="6" stroke="currentColor" strokeWidth="2" />
      <path d="M9 9h6M9 17h6M12 12v0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Forescout: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  "Cisco ISE": (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M4 14V10M8 18V6M12 16V8M16 18V6M20 14V10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export function hasGlyph(oem: string): boolean {
  if (Glyphs[oem]) return true;
  const head = oem.split(/\s+/)[0];
  return !!Glyphs[head];
}

export function getGlyph(oem: string): Glyph | undefined {
  if (Glyphs[oem]) return Glyphs[oem];
  const head = oem.split(/\s+/)[0];
  return Glyphs[head];
}
