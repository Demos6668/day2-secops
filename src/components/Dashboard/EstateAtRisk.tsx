import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/shared";
import { CauseFlagBadge } from "./CauseFlagBadge";
import { RagBadge } from "@/components/Common/RagBadge";
import { cn } from "@/lib/utils";
import type { Tool } from "@/types/tool";

interface EstateAtRiskProps {
  tools: Tool[];
  onOpen?: (tool: Tool) => void;
  className?: string;
}

const SEVERITY_ORDER = { Critical: 0, Moderate: 1, Low: 2 } as const;

/**
 * Always-on strip. Surfaces every red tool (or "all clear" if 0) so the
 * worst news is at the page entry point (F-pattern, DESIGN_PRINCIPLES L2).
 */
export function EstateAtRisk({ tools, onOpen, className }: EstateAtRiskProps) {
  const reds = tools
    .filter((t) => t.status === "red")
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  if (reds.length === 0) {
    return (
      <Card className={cn("glass-panel border-[#22C55E]/30 bg-[#22C55E]/[0.04]", className)}>
        <CardContent className="p-3 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-[#4ADE80] shrink-0" aria-hidden="true" />
          <div className="text-xs">
            <span className="font-semibold text-[#4ADE80]">Estate at risk — all clear.</span>
            <span className="text-muted-foreground ml-1.5">
              No tools in RAG red across {tools.length} tracked tools.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn("glass-panel border-[#EF4444]/45 bg-[#EF4444]/[0.06]", className)}
      role="region"
      aria-label="Estate at risk"
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[#F87171]" aria-hidden="true" />
            <div>
              <div className="text-xs font-semibold text-[#F87171] uppercase tracking-widest">
                Estate at risk
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                {reds.length} tool{reds.length === 1 ? "" : "s"} in RAG red — sorted by severity
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] border-[#EF4444]/40 text-[#F87171]">
            {reds.length} red
          </Badge>
        </div>
        <ul className="flex items-stretch gap-2 overflow-x-auto pb-1">
          {reds.map((t) => {
            const topCause = t.causes[0];
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onOpen?.(t)}
                  className="text-left flex flex-col gap-1 min-w-[180px] max-w-[230px] rounded border border-[#EF4444]/30 bg-card/70 px-2.5 py-2 hover:bg-card focus-visible:ring-2 focus-visible:ring-primary outline-none"
                  aria-label={`Open ${t.solution} — red, ${t.severity}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold truncate">{t.solution}</span>
                    <RagBadge status={t.status} showLabel={false} />
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate">
                    {t.oem} · {t.tower} · {t.severity}
                  </div>
                  <div className="text-[10px] font-mono text-[#F87171] tabular-nums">
                    {((t.observed / Math.max(1, t.denominator)) * 100).toFixed(1)}% visible
                  </div>
                  {topCause && (
                    <div className="mt-0.5">
                      <CauseFlagBadge cause={topCause} compact />
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
