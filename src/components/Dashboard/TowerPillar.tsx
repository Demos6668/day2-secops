import { useEffect, useRef, useState } from "react";
import { type LucideIcon, Bell, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/shared";
import { EmptyState } from "@/components/Common/EmptyState";
import { ToolTile } from "./ToolTile";
import { cn } from "@/lib/utils";
import type { RagStatus, Tool, Tower } from "@/types/tool";

interface TowerPillarProps {
  tower: Tower;
  icon: LucideIcon;
  tools: Tool[];
  onOpen: (tool: Tool) => void;
  /** Monotonic counter — pillar pulses when it increments. */
  alertPulse?: number;
  /** Render tiles in a multi-col grid when this is the only visible pillar. */
  expanded?: boolean;
  className?: string;
}

// DESIGN_PRINCIPLES L1 — worst first.
const STATUS_ORDER: Record<RagStatus, number> = { red: 0, amber: 1, green: 2 };
const SEVERITY_ORDER = { Critical: 0, Moderate: 1, Low: 2 } as const;

function compareTools(a: Tool, b: Tool): number {
  if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
    return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  }
  if (SEVERITY_ORDER[a.severity] !== SEVERITY_ORDER[b.severity]) {
    return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  }
  return a.solution.localeCompare(b.solution);
}

export function TowerPillar({
  tower,
  icon: Icon,
  tools,
  onOpen,
  alertPulse = 0,
  expanded: layoutExpanded = false,
  className,
}: TowerPillarProps) {
  const lastPulseRef = useRef(alertPulse);
  const [showPulse, setShowPulse] = useState(false);

  const counts = countsByStatus(tools);
  const allGreen = tools.length > 0 && counts.red === 0 && counts.amber === 0;

  // DESIGN_PRINCIPLES L3 — all-green pillars start collapsed (saves vertical space
  // for things that need attention). Operator can expand.
  const [expanded, setExpanded] = useState(!allGreen);
  // Re-evaluate whenever the all-green-ness flips (e.g. live feeder tipped a tile amber).
  useEffect(() => {
    setExpanded(!allGreen);
  }, [allGreen]);

  useEffect(() => {
    if (alertPulse <= lastPulseRef.current) return undefined;
    lastPulseRef.current = alertPulse;
    setShowPulse(true);
    const t = setTimeout(() => setShowPulse(false), 2200);
    return () => clearTimeout(t);
  }, [alertPulse]);

  const sortedTools = [...tools].sort(compareTools);

  return (
    <Card
      className={cn(
        "glass-panel transition-shadow",
        showPulse && "ring-2 ring-[#D97706]/60 ring-offset-1 ring-offset-background",
        className,
      )}
    >
      <CardContent className="p-3 space-y-2">
        <header
          className="flex items-center justify-between gap-2 pb-2 border-b hairline-b cursor-pointer select-none"
          onClick={() => setExpanded((v) => !v)}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={`${tower} tower — ${tools.length} tools, ${expanded ? "collapse" : "expand"}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="font-semibold text-sm uppercase tracking-wider flex items-center gap-1.5">
              {tower}
              {showPulse && (
                <Bell className="h-3 w-3 text-[#D97706] animate-pulse" aria-label="Recent change" />
              )}
              {allGreen && (
                <span className="text-[9px] font-mono text-[#4ADE80] ml-1">all clear</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <CountChip status="red" n={counts.red} />
            <CountChip status="amber" n={counts.amber} />
            <CountChip status="green" n={counts.green} />
            {expanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground ml-1" aria-hidden="true" />
            )}
          </div>
        </header>

        {expanded ? (
          tools.length === 0 ? (
            <EmptyState
              title="No tools match"
              description="Adjust filters to surface tools in this tower."
              className="py-6"
            />
          ) : (
            <div
              className={cn(
                layoutExpanded
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1"
                  : "space-y-1",
              )}
            >
              {sortedTools.map((t) => (
                <ToolTile key={t.id} tool={t} onOpen={onOpen} />
              ))}
            </div>
          )
        ) : (
          <div className="text-[11px] text-muted-foreground italic px-1 py-1.5">
            Collapsed — {tools.length} tools, all clear. Click to expand.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function countsByStatus(tools: Tool[]): Record<RagStatus, number> {
  const c: Record<RagStatus, number> = { green: 0, amber: 0, red: 0 };
  for (const t of tools) c[t.status]++;
  return c;
}

function CountChip({ status, n }: { status: RagStatus; n: number }) {
  // Brighter text for AA on 15% alpha bg.
  const tone: Record<RagStatus, string> = {
    green: "bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/30",
    amber: "bg-[#D97706]/15 text-[#FBBF24] border-[#D97706]/30",
    red: "bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30",
  };
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-mono tabular-nums px-1.5 py-0", tone[status])}
    >
      {n}
    </Badge>
  );
}
