import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/shared";
import { rollupFramework, type CellStatus } from "@/lib/audit/coverage";
import { cn } from "@/lib/utils";
import type { Framework, Tool } from "@/types/tool";

interface CombinedCoverageProps {
  frameworks: Framework[];
  tools: Tool[];
  onPickFramework: (fwId: string) => void;
}

const TONE: Record<CellStatus, string> = {
  covered: "bg-[#22C55E]",
  partial: "bg-[#D97706]",
  gap: "bg-[#EF4444]",
  na: "bg-muted-foreground/40",
};

export function CombinedCoverage({ frameworks, tools, onPickFramework }: CombinedCoverageProps) {
  const rollups = useMemo(
    () => frameworks.map((f) => rollupFramework(f, tools)),
    [frameworks, tools],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {rollups.map((r) => {
        const total = Math.max(1, r.totals.total);
        const pctCovered = (r.totals.covered / total) * 100;
        const pctPartial = (r.totals.partial / total) * 100;
        const pctGap = (r.totals.gap / total) * 100;
        return (
          <Card
            key={r.framework.id}
            className="glass-panel cursor-pointer hover:ring-1 hover:ring-primary/40 transition-shadow"
            onClick={() => onPickFramework(r.framework.id)}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === "Enter") onPickFramework(r.framework.id);
            }}
            aria-label={`Open ${r.framework.name} matrix`}
          >
            <CardContent className="p-4 space-y-3">
              <header>
                <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  {r.framework.shortName}
                </div>
                <div className="font-semibold text-sm">{r.framework.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">
                  {r.totals.total} controls
                </div>
              </header>

              <div className="h-2 rounded-full overflow-hidden flex bg-muted/30">
                <div className={cn(TONE.covered, "h-full")} style={{ width: `${pctCovered}%` }} />
                <div className={cn(TONE.partial, "h-full")} style={{ width: `${pctPartial}%` }} />
                <div className={cn(TONE.gap, "h-full")} style={{ width: `${pctGap}%` }} />
              </div>

              <ul className="flex items-center gap-3 text-[10px] font-mono">
                <Legend tone="covered" n={r.totals.covered} label="covered" />
                <Legend tone="partial" n={r.totals.partial} label="partial" />
                <Legend tone="gap" n={r.totals.gap} label="gap" />
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Legend({ tone, n, label }: { tone: CellStatus; n: number; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full inline-block", TONE[tone])} />
      <span>
        <span className="font-bold">{n}</span> {label}
      </span>
    </li>
  );
}
