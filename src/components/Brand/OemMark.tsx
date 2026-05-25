import { useState } from "react";
import { cn } from "@/lib/utils";
import { getOemMark } from "@/lib/brand/oem-marks";
import { getGlyph, hasGlyph } from "@/lib/brand/oem-glyphs";
import { getLogoCandidates } from "@/lib/brand/logo-url";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OemMarkProps {
  oem: string;
  size?: number;
  className?: string;
  /** Force monogram even when a logo / glyph is available (low-res print). */
  forceMonogram?: boolean;
  /** Wrap in a tooltip showing the OEM name on hover. Default true. */
  tooltip?: boolean;
}

/**
 * Brand chip for an OEM.
 *
 * Resolution chain:
 *   1. Local SVG from `public/images/oems/<slug>.svg` (if curated)
 *   2. Clearbit Logo API for the vendor's marketing domain
 *   3. Hand-curated geometric SVG glyph (abstract, not the real logo)
 *   4. 2-letter monogram on brand-colored tile
 *
 * The colored tile background is always rendered — even when a logo loads
 * on top of it, the color keeps the strip glanceable.
 */
export function OemMark({
  oem,
  size = 24,
  className,
  forceMonogram = false,
  tooltip = true,
}: OemMarkProps) {
  const def = getOemMark(oem);
  const Glyph = !forceMonogram && hasGlyph(oem) ? getGlyph(oem) : undefined;

  const candidates = forceMonogram ? [] : getLogoCandidates(oem, Math.max(64, size * 4));
  const [candidateIdx, setCandidateIdx] = useState(0);
  const [imageGaveUp, setImageGaveUp] = useState(candidates.length === 0);

  const onImgError = () => {
    if (candidateIdx + 1 < candidates.length) {
      setCandidateIdx(candidateIdx + 1);
    } else {
      setImageGaveUp(true);
    }
  };

  const visual = (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded font-bold shrink-0 select-none ring-1 ring-white/10 overflow-hidden",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: def.color,
        color: def.textColor ?? "#FFFFFF",
        fontSize: Math.max(8, size * 0.42),
        letterSpacing: "0.02em",
      }}
      role="img"
      aria-label={oem}
    >
      {!imageGaveUp && candidates.length > 0 ? (
        <img
          key={candidates[candidateIdx]}
          src={candidates[candidateIdx]}
          alt=""
          width={Math.max(12, Math.floor(size * 0.78))}
          height={Math.max(12, Math.floor(size * 0.78))}
          style={{
            width: `${Math.floor(size * 0.78)}px`,
            height: `${Math.floor(size * 0.78)}px`,
            objectFit: "contain",
          }}
          loading="lazy"
          decoding="async"
          onError={onImgError}
        />
      ) : Glyph ? (
        <Glyph
          width={Math.max(12, Math.floor(size * 0.7))}
          height={Math.max(12, Math.floor(size * 0.7))}
          aria-hidden="true"
        />
      ) : (
        def.initials
      )}
    </span>
  );

  if (!tooltip) return visual;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{visual}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {oem}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
