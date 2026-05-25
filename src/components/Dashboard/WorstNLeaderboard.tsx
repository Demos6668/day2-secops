import { Link } from "wouter";
import { TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/shared";
import { Badge } from "@/components/ui/badge";
import { OemMark } from "@/components/Brand";
import { RagBadge } from "@/components/Common/RagBadge";
import { CauseFlagBadge } from "./CauseFlagBadge";
import { rankByRisk } from "@/lib/visibility/risk";
import { cn } from "@/lib/utils";
import type { Tool } from "@/types/tool";

interface WorstNLeaderboardProps {
  tools: Tool[];
  n?: number;
  title?: string;
  description?: string;
  className?: string;
}

const STATUS_STRIPE: Record<Tool["status"], string> = {
  red: "lstripe-red",
  amber: "lstripe-amber",
  green: "lstripe-green",
};

/**
 * Worst-N leaderboard (research move #4).
 *
 * Tools ranked by numeric risk weight (severity × visibility deficit +
 * cause penalty + status bonus). Lets two reds rank against each other
 * instead of being equal-bucket-by-color.
 */
export function WorstNLeaderboard({
  tools,
  n = 5,
  title = "Worst-ranked tools",
  description = "Sorted by composite risk weight — severity × visibility deficit + cause penalty.",
  className,
}: WorstNLeaderboardProps) {
  const ranked = rankByRisk(tools).slice(0, n);
  if (ranked.length === 0) return null;

  return (
    <Card className={cn("glass-panel", className)}>
      <CardContent className="p-4 space-y-3">
        <header className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-3.5 w-3.5 text-[#F87171]" aria-hidden="true" />
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            top {ranked.length}
          </Badge>
        </header>
        <p className="text-[11px] text-muted-foreground -mt-1">{description}</p>

        <ol className="space-y-1.5">
          {ranked.map((t, idx) => {
            const pct = (t.observed / Math.max(1, t.denominator)) * 100;
            return (
              <li key={t.id}>
                <Link
                  href={`/tools/${t.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded border hairline bg-card/70 px-2.5 py-2 hover:bg-card transition-colors",
                    STATUS_STRIPE[t.status],
                  )}
                >
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-4 text-right">
                    {idx + 1}
                  </span>
                  <OemMark oem={t.oem} size={22} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{t.solution}</div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate">
                      {t.oem} · {t.tower} · {t.severity}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.causes.slice(0, 2).map((c) => (
                      <CauseFlagBadge key={c} cause={c} compact linked={false} />
                    ))}
                    <span className="text-[11px] font-mono tabular-nums text-foreground">
                      {pct.toFixed(1)}%
                    </span>
                    <RagBadge status={t.status} showLabel={false} />
                    <span
                      className="text-[10px] font-mono tabular-nums text-muted-foreground w-10 text-right"
                      title="Composite risk weight"
                    >
                      {t.risk.toFixed(0)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
