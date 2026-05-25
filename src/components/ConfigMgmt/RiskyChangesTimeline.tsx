import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Clock4,
  ShieldAlert,
  Filter,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OemMark } from "@/components/Brand";
import { cn, formatRelative } from "@/lib/utils";
import {
  ConfigChangesFileSchema,
  type ConfigChangeRisk,
  type ConfigChangeStatus,
} from "@/types/config-changes";
import changesRaw from "../../../workspaces/abcl/config-changes.json";
import type { Tool } from "@/types/tool";

const CHANGES = ConfigChangesFileSchema.parse(changesRaw).changes;

const RISK_TONE: Record<ConfigChangeRisk, string> = {
  safe: "border-[#22C55E]/30 text-[#4ADE80] bg-[#22C55E]/10",
  risky: "border-[#B45309]/40 text-[#F59E0B] bg-[#B45309]/10",
  dangerous: "border-[#EF4444]/40 text-[#F87171] bg-[#EF4444]/10",
};

const STATUS_TONE: Record<ConfigChangeStatus, string> = {
  pending_review: "border-primary/30 text-primary bg-primary/10",
  deployed: "border-muted-foreground/30 text-foreground bg-muted/30",
  rolled_back: "border-[#EF4444]/30 text-[#F87171] bg-[#EF4444]/10",
};

const STATUS_LABEL: Record<ConfigChangeStatus, string> = {
  pending_review: "pending review",
  deployed: "deployed",
  rolled_back: "rolled back",
};

const STATUS_ICON: Record<ConfigChangeStatus, typeof Clock4> = {
  pending_review: Clock4,
  deployed: CheckCircle2,
  rolled_back: RotateCcw,
};

const ALL_RISKS: ConfigChangeRisk[] = ["dangerous", "risky", "safe"];
const ALL_STATUS: ConfigChangeStatus[] = ["pending_review", "deployed", "rolled_back"];

export interface RiskyChangesTimelineProps {
  /** Live tool list — used to resolve OEM marks + solution names per change. */
  tools: Tool[];
}

export function RiskyChangesTimeline({ tools }: RiskyChangesTimelineProps) {
  const [pickedRisks, setRisks] = useState<ConfigChangeRisk[]>([]);
  const [pickedStatuses, setStatuses] = useState<ConfigChangeStatus[]>([]);
  const [riskyOnly, setRiskyOnly] = useState(true);

  const toolById = useMemo(() => {
    const m = new Map<string, Tool>();
    for (const t of tools) m.set(t.id, t);
    return m;
  }, [tools]);

  const filtered = useMemo(() => {
    return CHANGES.filter((c) => {
      if (riskyOnly && c.riskClass === "safe") return false;
      if (pickedRisks.length && !pickedRisks.includes(c.riskClass)) return false;
      if (pickedStatuses.length && !pickedStatuses.includes(c.status)) return false;
      return true;
    }).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [pickedRisks, pickedStatuses, riskyOnly]);

  const counts = useMemo(() => {
    const out: Record<ConfigChangeRisk, number> = { safe: 0, risky: 0, dangerous: 0 };
    for (const c of CHANGES) out[c.riskClass] += 1;
    return out;
  }, []);

  const toggle = <T,>(list: T[], setList: (v: T[]) => void, v: T) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const clear = () => {
    setRisks([]);
    setStatuses([]);
    setRiskyOnly(false);
  };

  const filterCount =
    pickedRisks.length + pickedStatuses.length + (riskyOnly ? 1 : 0);

  return (
    <Card className="glass-panel">
      <CardContent className="p-4 space-y-3">
        <header className="flex items-baseline justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 text-[#F87171]" aria-hidden="true" />
            <h3 className="text-sm font-semibold">Risky changes</h3>
            <div className="flex items-center gap-1.5 ml-2">
              <Badge variant="outline" className={cn("text-[10px] font-mono", RISK_TONE.dangerous)}>
                {counts.dangerous} dangerous
              </Badge>
              <Badge variant="outline" className={cn("text-[10px] font-mono", RISK_TONE.risky)}>
                {counts.risky} risky
              </Badge>
              <Badge variant="outline" className={cn("text-[10px] font-mono", RISK_TONE.safe)}>
                {counts.safe} safe
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5">
                  <Filter className="h-3 w-3" />
                  Filter
                  {filterCount > 0 && (
                    <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                      {filterCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Risk class
                </DropdownMenuLabel>
                {ALL_RISKS.map((r) => (
                  <DropdownMenuCheckboxItem
                    key={r}
                    checked={pickedRisks.includes(r)}
                    onCheckedChange={() => toggle(pickedRisks, setRisks, r)}
                    onSelect={(e) => e.preventDefault()}
                    className="text-xs capitalize"
                  >
                    {r}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Status
                </DropdownMenuLabel>
                {ALL_STATUS.map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s}
                    checked={pickedStatuses.includes(s)}
                    onCheckedChange={() => toggle(pickedStatuses, setStatuses, s)}
                    onSelect={(e) => e.preventDefault()}
                    className="text-xs"
                  >
                    {STATUS_LABEL[s]}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={riskyOnly}
                  onCheckedChange={(v) => setRiskyOnly(!!v)}
                  onSelect={(e) => e.preventDefault()}
                  className="text-xs"
                >
                  Hide safe changes
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {filterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 text-[10px]"
                onClick={clear}
                aria-label="Clear filters"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </header>

        <p className="text-[11px] text-muted-foreground -mt-1">
          Every config edit captured from the OEM admin consoles. Each entry is risk-classified
          against ANY-source rules, monitor-mode downgrades, retention-floor breaches, scope
          extensions, and rule-reorder hazards.
        </p>

        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-1 py-3">
            No changes match the current filter.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((c) => {
              const tool = toolById.get(c.toolId);
              const StatusIcon = STATUS_ICON[c.status];
              return (
                <li key={c.id}>
                  <article
                    className={cn(
                      "rounded border hairline bg-card/70 px-3 py-2.5",
                      c.riskClass === "dangerous" && "lstripe-red",
                      c.riskClass === "risky" && "lstripe-amber",
                      c.riskClass === "safe" && "lstripe-green",
                    )}
                  >
                    <header className="flex items-start gap-2.5 flex-wrap">
                      {tool && <OemMark oem={tool.oem} size={22} />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium truncate">
                            {tool ? (
                              <Link href={`/tools/${tool.id}`} className="hover:text-primary">
                                {tool.solution}
                              </Link>
                            ) : (
                              c.toolId
                            )}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] uppercase tracking-wider", RISK_TONE[c.riskClass])}
                          >
                            {c.riskClass === "dangerous" && (
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                            )}
                            {c.riskClass}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-mono inline-flex items-center gap-1",
                              STATUS_TONE[c.status],
                            )}
                          >
                            <StatusIcon className="h-2.5 w-2.5" aria-hidden="true" />
                            {STATUS_LABEL[c.status]}
                          </Badge>
                          {c.ticket && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {c.ticket}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground mt-1 leading-snug">{c.summary}</p>
                        {c.riskReasons.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {c.riskReasons.map((r, i) => (
                              <li
                                key={i}
                                className="text-[11px] text-muted-foreground flex items-start gap-1.5"
                              >
                                <span
                                  className={cn(
                                    "shrink-0 mt-1 inline-block rounded-full",
                                    c.riskClass === "dangerous"
                                      ? "bg-[#F87171]"
                                      : c.riskClass === "risky"
                                        ? "bg-[#F59E0B]"
                                        : "bg-muted-foreground",
                                    "h-1 w-1",
                                  )}
                                  aria-hidden="true"
                                />
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {c.diff && (
                          <pre className="mt-1.5 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap leading-snug bg-background/40 rounded px-2 py-1.5 border border-border">
                            {c.diff}
                          </pre>
                        )}
                        <div className="mt-1.5 text-[10px] font-mono text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span>{c.actor}</span>
                          <span className="text-border">·</span>
                          <span>{c.type}</span>
                          <span className="text-border">·</span>
                          <span>{formatRelative(c.timestamp)}</span>
                        </div>
                      </div>
                    </header>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
