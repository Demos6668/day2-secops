import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Database,
  GaugeCircle,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/shared";
import { WorkspaceSelector } from "./WorkspaceSelector";
import { cn } from "@/lib/utils";
import type { RagStatus, Tool } from "@/types/tool";

interface TopStripProps {
  workspace: { id: string; name: string };
  workspaces: { id: string; name: string }[];
  tools: Tool[];
  totalAssetsTracked: number;
  className?: string;
}

export function TopStrip({
  workspace,
  workspaces,
  tools,
  totalAssetsTracked,
  className,
}: TopStripProps) {
  const sumObserved = tools.reduce((a, t) => a + t.observed, 0);
  const sumDenom = tools.reduce((a, t) => a + t.denominator, 0);
  const overallPct = sumDenom > 0 ? (sumObserved / sumDenom) * 100 : 0;

  const counts: Record<RagStatus, number> = { green: 0, amber: 0, red: 0 };
  for (const t of tools) counts[t.status]++;

  // Track deltas vs the previous render (gives us Vercel-style Δ arrows
  // without sparklines or extra state stores).
  const prevRef = useRef({ overallPct, red: counts.red, amber: counts.amber, total: sumObserved });
  const [deltas, setDeltas] = useState({ overallPct: 0, red: 0, amber: 0, total: 0 });
  useEffect(() => {
    setDeltas({
      overallPct: overallPct - prevRef.current.overallPct,
      red: counts.red - prevRef.current.red,
      amber: counts.amber - prevRef.current.amber,
      total: sumObserved - prevRef.current.total,
    });
    prevRef.current = { overallPct, red: counts.red, amber: counts.amber, total: sumObserved };
  }, [overallPct, counts.red, counts.amber, sumObserved]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <WorkspaceSelector current={workspace} workspaces={workspaces} />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {tools.length} tools tracked
          </span>
        </div>
      </div>

      {/* 3-card row (was 4) — workspace dropped, freed space goes to numbers. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat
          icon={ShieldAlert}
          label="Estate posture"
          value={`${counts.red} / ${counts.amber} / ${counts.green}`}
          delta={counts.red - prevRef.current.red}
          deltaInverted
          accent={counts.red > 0 ? "red" : counts.amber > 0 ? "amber" : "green"}
          hint="Red · Amber · Green tools"
        />
        <Stat
          icon={GaugeCircle}
          label="Overall visibility"
          value={`${overallPct.toFixed(1)}%`}
          delta={deltas.overallPct}
          decimals={2}
          unit="%"
          accent={overallPct < 90 ? "amber" : "green"}
        />
        <Stat
          icon={Database}
          label="Assets observed"
          value={sumObserved.toLocaleString()}
          delta={deltas.total}
          unit=""
          hint={`of ${totalAssetsTracked.toLocaleString()} tracked`}
        />
      </div>
    </div>
  );
}

const ACCENT: Record<RagStatus | "default", string> = {
  green: "border-[#22C55E]/25",
  amber: "border-[#B45309]/25",
  red: "border-[#EF4444]/30",
  default: "border-white/5",
};

interface StatProps {
  icon: typeof Activity;
  label: string;
  value: string;
  delta?: number;
  /** Decimal places for delta display. */
  decimals?: number;
  /** Suffix appended to delta (eg. "%"). */
  unit?: string;
  /** When true, a positive delta is "bad" (e.g. more red tools). */
  deltaInverted?: boolean;
  /** Small caption below the value. */
  hint?: string;
  accent?: RagStatus | "default";
}

function Stat({
  icon: Icon,
  label,
  value,
  delta,
  decimals = 0,
  unit = "",
  deltaInverted,
  hint,
  accent = "default",
}: StatProps) {
  const dir: "up" | "down" | "flat" =
    delta === undefined || Math.abs(delta) < 0.001 ? "flat" : delta > 0 ? "up" : "down";
  // "Good" = green; "bad" = red. Direction interpretation depends on the metric.
  const goodDirection = deltaInverted ? "down" : "up";
  const tone =
    dir === "flat"
      ? "text-muted-foreground"
      : dir === goodDirection
        ? "text-[#4ADE80]"
        : "text-[#F87171]";
  const DeltaIcon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;

  return (
    <Card className={cn("glass-panel border", ACCENT[accent])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            <Icon className="h-3 w-3" />
            {label}
          </div>
          {delta !== undefined && (
            <span
              className={cn("inline-flex items-center text-[11px] font-mono tabular-nums", tone)}
            >
              <DeltaIcon className="h-3 w-3 mr-0.5" aria-hidden="true" />
              {dir === "flat" ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(decimals)}${unit}`}
            </span>
          )}
        </div>
        <div
          className="text-[1.75rem] font-bold mt-1 text-num tabular-nums leading-tight truncate"
          title={value}
        >
          {value}
        </div>
        {hint && (
          <div className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">{hint}</div>
        )}
      </CardContent>
    </Card>
  );
}
