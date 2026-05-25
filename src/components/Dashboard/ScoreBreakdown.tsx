import { useMemo } from "react";
import { ArrowDownRight, AlertOctagon, Calculator, Clock4, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CoverageRing } from "./CoverageRing";
import { CauseFlagBadge } from "./CauseFlagBadge";
import { VisibilitySparkline } from "./VisibilitySparkline";
import { RagBadge } from "@/components/Common/RagBadge";
import { scoreVisibility } from "@/lib/visibility/score";
import { CAUSE_WEIGHT_NUMERIC, SEVERITY_WEIGHT, getRagToken } from "@/lib/rag-tokens";
import { CAUSES, CAUSE_ORDER } from "@/lib/visibility/causes";
import { cn, formatRelative } from "@/lib/utils";
import type { Tool, VisibilityCauseFlag } from "@/types/tool";

interface ScoreBreakdownProps {
  tool: Tool;
  /** Tower freshness SLO for the tool, in hours. Used to flag stale_data. */
  freshnessSloHours: number;
  className?: string;
}

/**
 * Non-negotiable "why is it red?" panel.
 *
 * Surfaces every input that drove the score: visibility %, severity weight,
 * gap penalty, every active cause (with its individual penalty), the score
 * itself, and any hard override that fired. One look = one answer.
 */
export function ScoreBreakdown({ tool, freshnessSloHours, className }: ScoreBreakdownProps) {
  const breakdown = useMemo(
    () =>
      scoreVisibility({
        severity: tool.severity,
        observed: tool.observed,
        denominator: tool.denominator,
        causes: tool.causes,
      }),
    [tool],
  );

  const ragColor = getRagToken(tool.status).hex;
  const lastSyncDate = new Date(tool.lastSync);
  const hoursSinceSync = (Date.now() - lastSyncDate.getTime()) / 3_600_000;
  const isStale = hoursSinceSync > freshnessSloHours;

  return (
    <div className={cn("space-y-5", className)}>
      {/* Hero: ring + headline numbers */}
      <section className="flex items-start gap-4">
        <CoverageRing
          value={breakdown.visibilityPct}
          status={tool.status}
          size={108}
          thickness={10}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <RagBadge status={tool.status} />
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {tool.severity}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {tool.tower}
            </Badge>
          </div>
          <div className="mt-2 text-[11px] font-mono text-muted-foreground space-y-0.5">
            <div>
              {tool.observed.toLocaleString()} / {tool.denominator.toLocaleString()}{" "}
              {tool.denominatorUnit ?? "covered"}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock4 className="h-3 w-3" aria-hidden="true" />
              synced {formatRelative(tool.lastSync)}
              {isStale && <span className="text-[#D97706]"> · past {freshnessSloHours}h SLO</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            score
          </div>
          <div className="text-3xl font-bold text-num leading-none" style={{ color: ragColor }}>
            {breakdown.score.toFixed(1)}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">/ 100</div>
        </div>
      </section>

      {breakdown.override && (
        <div
          className="flex items-start gap-2 rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-xs"
          role="alert"
        >
          <AlertOctagon className="h-4 w-4 text-[#EF4444] mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-semibold text-[#EF4444]">Hard override active — forced RED</div>
            <div className="text-muted-foreground mt-0.5">
              {breakdown.override === "critical_high_cause"
                ? "A High-weight cause is active on a Critical tool."
                : "Visibility on a Critical tool dropped below 85%."}
            </div>
          </div>
        </div>
      )}

      {/* Math: how the score was built */}
      <section className="space-y-2">
        <header className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
          <Calculator className="h-3 w-3" aria-hidden="true" />
          Score breakdown
        </header>
        <dl className="text-xs space-y-1.5 rounded-md border border-border bg-background/40 p-3 font-mono">
          <BreakdownRow
            label="Visibility %"
            value={`${(breakdown.visibilityPct * 100).toFixed(2)}%`}
          />
          <BreakdownRow
            label="Severity weight"
            value={`× ${SEVERITY_WEIGHT[tool.severity].toFixed(1)} (${tool.severity})`}
          />
          <BreakdownRow
            label="Coverage gap penalty"
            value={`− ${breakdown.gapPenalty.toFixed(2)}`}
            tone="penalty"
          />
          <BreakdownRow
            label={`Cause penalty (${tool.causes.length} active)`}
            value={`− ${breakdown.causePenalty.toFixed(2)}`}
            tone="penalty"
          />
          <Separator className="my-1" />
          <BreakdownRow
            label="Score"
            value={`= ${breakdown.score.toFixed(2)}`}
            tone="total"
            color={ragColor}
          />
        </dl>
      </section>

      {/* Active causes (rich): every cause with its individual contribution */}
      <section className="space-y-2">
        <header className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Active causes
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            {tool.causes.length === 0
              ? "no causes flagged"
              : `${tool.causes.length} flagged · −${breakdown.causePenalty.toFixed(0)} pts total`}
          </div>
        </header>
        {tool.causes.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No cause flags. Gap, if any, is purely a coverage deficit.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {orderCauses(tool.causes).map((c) => (
              <li
                key={c}
                className="flex items-start justify-between gap-3 rounded border border-border bg-background/40 p-2"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <CauseFlagBadge cause={c} compact />
                  <div className="min-w-0">
                    <div className="text-xs font-medium">{CAUSES[c].label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {CAUSES[c].description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono">
                  <ArrowDownRight className="h-3 w-3 text-[#EF4444]" aria-hidden="true" />−
                  {CAUSE_WEIGHT_NUMERIC[CAUSES[c].weight]}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Sparkline */}
      <section className="space-y-2">
        <header className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
          Visibility — last 24 points
        </header>
        <div className="rounded-md border border-border bg-background/40 p-2">
          <VisibilitySparkline tool={tool} />
        </div>
        <p className="text-[10px] text-muted-foreground font-mono">
          Mock series (Phase 3 wires the live feeder)
        </p>
      </section>

      {/* Source links + audit notes slot */}
      <section className="space-y-2">
        <header className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
          Source &amp; audit notes
        </header>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-7" disabled>
            <ExternalLink className="h-3 w-3 mr-1.5" />
            Open in {tool.oem}
          </Button>
          <Button variant="outline" size="sm" className="h-7" disabled>
            Add audit note
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground italic">
          External link wiring + evidence locker land in Phase 4.
        </p>
      </section>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  tone,
  color,
}: {
  label: string;
  value: string;
  tone?: "penalty" | "total";
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          tone === "penalty" && "text-[#EF4444]",
          tone === "total" && "font-bold",
        )}
        style={tone === "total" && color ? { color } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function orderCauses(causes: VisibilityCauseFlag[]): VisibilityCauseFlag[] {
  const set = new Set(causes);
  return CAUSE_ORDER.filter((c) => set.has(c));
}
