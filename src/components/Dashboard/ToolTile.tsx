import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OemMark } from "@/components/Brand";
import { CAUSES } from "@/lib/visibility/causes";
import { CAUSE_ICONS } from "@/lib/visibility/cause-icons";
import { getRagToken } from "@/lib/rag-tokens";
import { cn, formatRelative } from "@/lib/utils";
import type { Tool, VisibilityCauseFlag } from "@/types/tool";

interface ToolTileProps {
  tool: Tool;
  onOpen?: (tool: Tool) => void;
  className?: string;
}

const STATUS_STRIPE: Record<Tool["status"], string> = {
  red: "bg-[#EF4444]",
  amber: "bg-[#B45309]",
  green: "bg-[#22C55E]",
};

const SEVERITY_LABEL: Record<Tool["severity"], string> = {
  Critical: "CRIT",
  Moderate: "MOD",
  Low: "LOW",
};

const SEVERITY_TEXT: Record<Tool["severity"], string> = {
  Critical: "text-[#F87171]",
  Moderate: "text-[#F59E0B]",
  Low: "text-muted-foreground",
};

/** Pick the highest-weight cause active on the tool, for the count badge. */
function dominantCauseWeight(causes: VisibilityCauseFlag[]): "High" | "Medium" | "Low" | null {
  if (causes.length === 0) return null;
  let hasMedium = false;
  for (const c of causes) {
    const w = CAUSES[c].weight;
    if (w === "High") return "High";
    if (w === "Medium") hasMedium = true;
  }
  return hasMedium ? "Medium" : "Low";
}

const CAUSE_BADGE_TONE = {
  High: "text-[#F87171] border-[#EF4444]/40 bg-[#EF4444]/10",
  Medium: "text-[#F59E0B] border-[#B45309]/40 bg-[#B45309]/10",
  Low: "text-muted-foreground border-muted-foreground/30 bg-muted/30",
} as const;

/**
 * Dense 40 px row per tool (Linear-spine + GitHub right-edge severity).
 *
 * Slots, left → right:
 *   [2px RAG stripe] [24px OEM logo] [solution · oem]
 *   [88px visibility bar + %] [56px severity] [28px cause count] [56px sync]
 *
 * Per the audit, the 72 px CoverageRing, absolute counts, hosting label,
 * full cause names, and absolute timestamps moved to hover-tooltips and
 * the score breakdown drawer. The row stays glanceable.
 */
export function ToolTile({ tool, onOpen, className }: ToolTileProps) {
  const visibilityPct = tool.observed / Math.max(1, tool.denominator);
  const pctStr = `${(visibilityPct * 100).toFixed(1)}%`;
  const ragColor = getRagToken(tool.status).hex;
  const causeCount = tool.causes.length;
  const causeWeight = dominantCauseWeight(tool.causes);
  // Pick a representative icon for the count badge — first cause is good enough.
  const FirstCauseIcon = causeCount > 0 ? CAUSE_ICONS[tool.causes[0]] : null;

  return (
    <div
      className={cn(
        "group relative h-12 flex items-center gap-1.5 pr-2 pl-3 rounded-md",
        "bg-card hover:bg-white/[0.03] focus-visible:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-primary",
        "cursor-pointer outline-none transition-colors",
        className,
      )}
      tabIndex={0}
      role="button"
      aria-label={`${tool.solution} — ${pctStr} visible, ${tool.status}, ${tool.severity}. Press Enter to open breakdown.`}
      onClick={() => onOpen?.(tool)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(tool);
        }
      }}
    >
      {/* 2px RAG left stripe */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full",
          STATUS_STRIPE[tool.status],
        )}
      />

      {/* OEM logo — also carries name tooltip via OemMark */}
      <OemMark oem={tool.oem} size={26} />

      {/* Title block: solution (line 1, prominent) + OEM (line 2, brand-tinted) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[14px] font-semibold truncate text-foreground">
              {tool.solution}
            </div>
            <div className="text-[11px] font-medium truncate text-muted-foreground/90 mt-0.5">
              {tool.oem}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          <div className="font-semibold">{tool.solution}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {tool.oem} · {tool.tower} · {tool.hosting}
          </div>
          <div className="text-[11px] font-mono text-muted-foreground mt-1">
            {tool.observed.toLocaleString()} / {tool.denominator.toLocaleString()}
            {tool.denominatorUnit ? ` ${tool.denominatorUnit}` : ""}
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Visibility: thin tinted bar + tabular % */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 w-[60px] shrink-0">
            <div className="relative h-[4px] flex-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${Math.max(0, Math.min(100, visibilityPct * 100))}%`,
                  background: ragColor,
                }}
              />
            </div>
            <span
              className="text-[10px] font-mono tabular-nums w-[28px] text-right"
              style={{ color: ragColor }}
            >
              {(visibilityPct * 100).toFixed(0)}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {pctStr} visible · {tool.observed.toLocaleString()} of {tool.denominator.toLocaleString()}
        </TooltipContent>
      </Tooltip>

      {/* Severity: text-only chip, RAG-color text, no fill */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "w-[32px] shrink-0 text-center text-[10px] font-bold tracking-wider uppercase",
              SEVERITY_TEXT[tool.severity],
            )}
          >
            {SEVERITY_LABEL[tool.severity]}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tool.severity} severity tool
        </TooltipContent>
      </Tooltip>

      {/* Cause count badge — colored by dominant weight */}
      <div className="w-[28px] shrink-0 flex justify-center">
        {causeCount > 0 && FirstCauseIcon && causeWeight && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] font-mono tabular-nums",
                  CAUSE_BADGE_TONE[causeWeight],
                )}
              >
                <FirstCauseIcon className="h-3 w-3" aria-hidden="true" />
                {causeCount}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-xs">
              <div className="text-[10px] font-mono text-muted-foreground mb-1">
                {causeCount} active {causeCount === 1 ? "cause" : "causes"}
              </div>
              <ul className="space-y-0.5">
                {tool.causes.map((c) => (
                  <li key={c} className="text-[11px]">
                    {CAUSES[c].label}{" "}
                    <span className="text-muted-foreground">· {CAUSES[c].weight}</span>
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

    </div>
  );
}
