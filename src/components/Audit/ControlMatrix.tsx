import { useMemo, useState } from "react";
import { Check, AlertTriangle, X, Minus, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/shared";
import { cellFor, rollupControl, type CellStatus } from "@/lib/audit/coverage";
import { cn } from "@/lib/utils";
import type { Framework, Tool } from "@/types/tool";

interface ControlMatrixProps {
  framework: Framework;
  tools: Tool[];
}

// Brighter text against the 20% alpha background so contrast stays AA on dark.
const STATUS_TONE: Record<CellStatus, string> = {
  covered: "bg-[#22C55E]/20 text-[#4ADE80] border-[#22C55E]/35",
  partial: "bg-[#D97706]/20 text-[#FBBF24] border-[#D97706]/35",
  gap: "bg-[#EF4444]/20 text-[#F87171] border-[#EF4444]/35",
  na: "bg-muted/30 text-muted-foreground border-border",
};

const ICONS: Record<CellStatus, typeof Check> = {
  covered: Check,
  partial: AlertTriangle,
  gap: X,
  na: Minus,
};

export function ControlMatrix({ framework, tools }: ControlMatrixProps) {
  const [selected, setSelected] = useState<{ ctrlId: string; toolId?: string } | null>(null);

  const rows = useMemo(
    () => framework.controls.map((c) => rollupControl(c, tools)),
    [framework, tools],
  );

  return (
    <Card className="glass-panel overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <tr className="border-b border-white/5">
                <th className="text-left px-3 py-2 font-mono uppercase text-[10px] tracking-widest text-muted-foreground sticky left-0 bg-card/95 z-20 min-w-[14rem]">
                  Control
                </th>
                {tools.map((t) => (
                  <th
                    key={t.id}
                    className="px-2 py-2 text-center font-mono uppercase text-[9px] tracking-widest text-muted-foreground min-w-[110px]"
                  >
                    <div className="truncate" title={t.solution}>
                      {t.oem}
                    </div>
                    <div className="text-[8px] opacity-70 truncate" title={t.solution}>
                      {t.solution.length > 14 ? `${t.solution.slice(0, 14)}…` : t.solution}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-mono uppercase text-[10px] tracking-widest text-muted-foreground sticky right-0 bg-card/95 z-20">
                  Roll-up
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.control.id}
                  id={row.control.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <th
                    scope="row"
                    className="text-left px-3 py-2 align-top sticky left-0 bg-card/90 z-10 min-w-[14rem]"
                  >
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {row.control.id}
                    </div>
                    <div className="font-medium text-xs">{row.control.title}</div>
                  </th>
                  {tools.map((t) => {
                    const cell = cellFor(row.control, t);
                    const Icon = ICONS[cell.status];
                    const active = selected?.ctrlId === row.control.id && selected.toolId === t.id;
                    return (
                      <td key={t.id} className="px-1.5 py-1.5 text-center">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label={`${t.solution} ${cell.status}`}
                                onClick={() =>
                                  setSelected(
                                    active ? null : { ctrlId: row.control.id, toolId: t.id },
                                  )
                                }
                                className={cn(
                                  "inline-flex items-center justify-center w-6 h-6 rounded border",
                                  STATUS_TONE[cell.status],
                                  active && "ring-2 ring-primary/60",
                                )}
                              >
                                <Icon className="h-3 w-3" aria-hidden="true" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="text-xs font-medium">{t.solution}</div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {cell.rationale}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-center sticky right-0 bg-card/90 z-10">
                    {(() => {
                      const RollIcon = ICONS[row.overall];
                      return (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                            STATUS_TONE[row.overall],
                          )}
                        >
                          <RollIcon className="h-3 w-3" aria-hidden="true" />
                          {row.overall}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      {selected && (
        <div className="border-t border-white/5 px-4 py-3 bg-background/40 flex items-center justify-between text-xs">
          <div>
            <span className="font-mono text-muted-foreground mr-2">{selected.ctrlId}</span>
            {selected.toolId && (
              <>
                <span className="font-mono text-muted-foreground">×</span>
                <span className="font-mono ml-2">{selected.toolId}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            Evidence locker — open the control for attested artifacts.
            <ExternalLink className="h-3 w-3" />
          </div>
        </div>
      )}
    </Card>
  );
}
