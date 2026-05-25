import { cn } from "@/lib/utils";
import { getRagToken } from "@/lib/rag-tokens";
import type { RagStatus } from "@/types/tool";

interface CoverageRingProps {
  /** 0..1 — visibility_pct from score.ts */
  value: number;
  status: RagStatus;
  size?: number;
  /** Stroke thickness in px. */
  thickness?: number;
  /** Show the % readout in the center. Default true. */
  showLabel?: boolean;
  className?: string;
}

/**
 * Pure-SVG visibility ring. No charting library — recharts is for the
 * sparkline, this needs to stay tiny for 12+ instances per page.
 */
export function CoverageRing({
  value,
  status,
  size = 88,
  thickness = 8,
  showLabel = true,
  className,
}: CoverageRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const pct = clamped * 100;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);
  const color = getRagToken(status).hex;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Visibility ${pct.toFixed(1)}% — status ${status}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--border))"
          strokeWidth={thickness}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span
            className="text-num font-bold tabular-nums"
            style={{ fontSize: size * 0.22, color }}
          >
            {pct.toFixed(pct >= 99.95 ? 0 : 1)}
          </span>
          <span className="text-[9px] uppercase tracking-widest font-mono text-muted-foreground mt-0.5">
            visible
          </span>
        </div>
      )}
    </div>
  );
}
