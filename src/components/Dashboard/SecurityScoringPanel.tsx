import { useMemo, useState } from "react";
import { Link } from "wouter";
import { TrendingDown, Filter, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OemMark } from "@/components/Brand";
import { RagBadge } from "@/components/Common/RagBadge";
import { LossReasonChips } from "./LossReasonChips";
import { rankByRisk } from "@/lib/visibility/risk";
import { cn } from "@/lib/utils";
import {
  TOWER_FRESHNESS_KEY,
  type RagStatus,
  type Severity,
  type Tool,
  type WorkspaceConfig,
} from "@/types/tool";

interface SecurityScoringPanelProps {
  tools: Tool[];
  workspaceConfig: WorkspaceConfig;
  n?: number;
  className?: string;
}

const STATUS_STRIPE: Record<Tool["status"], string> = {
  red: "lstripe-red",
  amber: "lstripe-amber",
  green: "lstripe-green",
};

const SEVERITIES: Severity[] = ["Critical", "Moderate", "Low"];
const STATUSES: RagStatus[] = ["red", "amber", "green"];

/**
 * Security Scoring — composite risk leaderboard with explainable reasons.
 *
 * Score = severity-weighted coverage gap + cause-flag penalty + staleness
 * decay + status bonus. Every row shows one-line reasons explaining why it
 * ranks where it does. Filter scopes the panel without touching the rest
 * of the dashboard.
 */
export function SecurityScoringPanel({
  tools,
  workspaceConfig,
  n = 6,
  className,
}: SecurityScoringPanelProps) {
  const [pickedSeverities, setSeverities] = useState<Severity[]>([]);
  const [pickedStatuses, setStatuses] = useState<RagStatus[]>([]);
  const [highCauseOnly, setHighCauseOnly] = useState(false);
  const [staleOnly, setStaleOnly] = useState(false);

  const filtered = useMemo(() => {
    return tools.filter((t) => {
      if (pickedSeverities.length && !pickedSeverities.includes(t.severity)) return false;
      if (pickedStatuses.length && !pickedStatuses.includes(t.status)) return false;
      if (highCauseOnly) {
        if (
          !t.causes.some(
            (c) =>
              c === "agent_absent" ||
              c === "agent_silent" ||
              c === "coverage_gap" ||
              c === "telemetry_blocked",
          )
        ) {
          return false;
        }
      }
      if (staleOnly) {
        const hoursSince = (Date.now() - new Date(t.lastSync).getTime()) / 3_600_000;
        const sloHours =
          t.freshnessSloHoursOverride ??
          workspaceConfig.freshnessSloHours[TOWER_FRESHNESS_KEY[t.tower]];
        if (hoursSince <= sloHours) return false;
      }
      return true;
    });
  }, [tools, workspaceConfig, pickedSeverities, pickedStatuses, highCauseOnly, staleOnly]);

  const ranked = useMemo(
    () => rankByRisk(filtered, workspaceConfig).slice(0, n),
    [filtered, workspaceConfig, n],
  );

  const filterCount =
    pickedSeverities.length + pickedStatuses.length + (highCauseOnly ? 1 : 0) + (staleOnly ? 1 : 0);

  const toggle = <T,>(list: T[], setList: (v: T[]) => void, v: T) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const clearAll = () => {
    setSeverities([]);
    setStatuses([]);
    setHighCauseOnly(false);
    setStaleOnly(false);
  };

  return (
    <Card className={cn("glass-panel", className)}>
      <CardContent className="p-4 space-y-3">
        <header className="flex items-baseline justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-3.5 w-3.5 text-[#F87171]" aria-hidden="true" />
            <h3 className="text-sm font-semibold">Security Scoring</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] font-mono">
              top {ranked.length}
            </Badge>
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
                  Severity
                </DropdownMenuLabel>
                {SEVERITIES.map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s}
                    checked={pickedSeverities.includes(s)}
                    onCheckedChange={() => toggle(pickedSeverities, setSeverities, s)}
                    onSelect={(e) => e.preventDefault()}
                    className="text-xs"
                  >
                    {s}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Status
                </DropdownMenuLabel>
                {STATUSES.map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s}
                    checked={pickedStatuses.includes(s)}
                    onCheckedChange={() => toggle(pickedStatuses, setStatuses, s)}
                    onSelect={(e) => e.preventDefault()}
                    className="text-xs"
                  >
                    {s.toUpperCase()}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Other
                </DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={highCauseOnly}
                  onCheckedChange={(v) => setHighCauseOnly(!!v)}
                  onSelect={(e) => e.preventDefault()}
                  className="text-xs"
                >
                  Has high-weight cause
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={staleOnly}
                  onCheckedChange={(v) => setStaleOnly(!!v)}
                  onSelect={(e) => e.preventDefault()}
                  className="text-xs"
                >
                  Past freshness SLO
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {filterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 text-[10px]"
                onClick={clearAll}
                aria-label="Clear filters"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </header>
        <p className="text-[11px] text-muted-foreground -mt-1">
          Composite risk weight = severity × coverage deficit + cause penalty + staleness decay +
          status bonus. Time-since-sync factored in.
        </p>

        {ranked.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-1 py-3">
            No tools match the current filter.
          </p>
        ) : (
          <ol className="space-y-1.5">
            {ranked.map((t, idx) => (
              <li key={t.id}>
                <Link
                  href={`/tools/${t.id}`}
                  aria-label={`#${idx + 1} ${t.solution} by ${t.oem} — ${t.tower}, ${t.severity}, status ${t.status.toUpperCase()}, risk ${t.risk.toFixed(0)}`}
                  className={cn(
                    "flex items-start gap-3 rounded border hairline bg-card/70 px-2.5 py-2 hover:bg-card transition-colors",
                    STATUS_STRIPE[t.status],
                  )}
                >
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-4 text-right pt-0.5">
                    {idx + 1}
                  </span>
                  <OemMark oem={t.oem} size={22} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium truncate">{t.solution}</span>
                      <span className="text-[10px] font-mono text-muted-foreground truncate">
                        {t.oem} · {t.tower} · {t.severity}
                      </span>
                    </div>
                    {t.reasons.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-[10px] font-mono text-muted-foreground leading-snug">
                        {t.reasons.map((r, ri) => (
                          <li key={ri}>{r.label}</li>
                        ))}
                      </ul>
                    )}
                    {t.activeLossReasons && t.activeLossReasons.length > 0 && (
                      <div className="mt-1.5">
                        <LossReasonChips oem={t.oem} codes={t.activeLossReasons} compact />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <RagBadge status={t.status} showLabel={false} />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="text-[11px] font-mono tabular-nums text-foreground w-10 text-right"
                          aria-label={`Risk score ${t.risk.toFixed(0)}`}
                        >
                          {t.risk.toFixed(0)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        Composite risk weight (higher = worse). Click to open breakdown.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
