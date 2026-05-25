import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { reasonsForOem } from "@/lib/feeder/seed";
import type { OemLossReason } from "@/types/oem-reasons";

interface LossReasonChipsProps {
  oem: string;
  /** Reason codes from `tool.activeLossReasons`. */
  codes: string[];
  /** When true, render a single-row compact strip (no descriptions inline). */
  compact?: boolean;
  className?: string;
}

const TONE: Record<OemLossReason["severity"], string> = {
  Critical: "border-[#EF4444]/40 text-[#F87171] bg-[#EF4444]/10",
  High: "border-[#B45309]/40 text-[#F59E0B] bg-[#B45309]/10",
  Medium: "border-[#D97706]/30 text-[#FBBF24] bg-[#D97706]/10",
  Low: "border-muted-foreground/30 text-muted-foreground bg-muted/30",
};

export function LossReasonChips({ oem, codes, compact = false, className }: LossReasonChipsProps) {
  if (!codes || codes.length === 0) return null;
  const catalog = reasonsForOem(oem);
  const resolved: OemLossReason[] = codes
    .map((c) => catalog.find((r) => r.code === c))
    .filter((r): r is OemLossReason => Boolean(r));
  if (resolved.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {resolved.map((r) => (
        <Tooltip key={r.code}>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono",
                compact ? "text-[10px]" : "text-[11px]",
                TONE[r.severity],
              )}
              data-reason-code={r.code}
              data-reason-severity={r.severity}
            >
              <Info className="h-2.5 w-2.5" aria-hidden="true" />
              <span className="truncate max-w-[16rem]">{r.label}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            <div className="font-semibold">{r.label}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{r.description}</div>
            <div className="text-[10px] font-mono text-muted-foreground/80 mt-1.5">
              {oem} console · {r.consolePath}
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
