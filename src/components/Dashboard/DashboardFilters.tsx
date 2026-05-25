import { Filter, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { CAUSES, CAUSE_ORDER } from "@/lib/visibility/causes";
import { cn } from "@/lib/utils";
import type { RagStatus, Severity, Tower } from "@/types/tool";

interface DashboardFiltersBarProps {
  oems: string[];
  hostings: string[];
  className?: string;
}

const SEVERITIES: Severity[] = ["Critical", "Moderate", "Low"];
const TOWERS: Tower[] = [
  "Endpoint Security",
  "Application Security",
  "Network Security",
  "Data Security",
  "Identity Security",
];
const STATUSES: RagStatus[] = ["red", "amber", "green"];

export function DashboardFiltersBar({ oems, hostings, className }: DashboardFiltersBarProps) {
  const { filters, toggle, clear, setFilters, isEmpty } = useDashboardFilters();
  const activeCount =
    filters.severities.length +
    filters.towers.length +
    filters.statuses.length +
    filters.oems.length +
    filters.hostings.length +
    filters.causes.length +
    (filters.query ? 1 : 0);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Input
        value={filters.query}
        onChange={(e) => setFilters({ ...filters, query: e.target.value })}
        placeholder="Filter by solution or OEM…"
        className="h-8 max-w-[18rem] text-xs"
        aria-label="Filter tools by name"
      />

      <FilterMenu
        label="Status"
        active={filters.statuses}
        options={STATUSES.map((s) => ({ value: s, label: s.toUpperCase() }))}
        onToggle={(v) => toggle("statuses", v)}
      />
      <FilterMenu
        label="Severity"
        active={filters.severities}
        options={SEVERITIES.map((s) => ({ value: s, label: s }))}
        onToggle={(v) => toggle("severities", v)}
      />
      <FilterMenu
        label="Tower"
        active={filters.towers}
        options={TOWERS.map((t) => ({ value: t, label: t }))}
        onToggle={(v) => toggle("towers", v)}
      />
      <FilterMenu
        label="OEM"
        active={filters.oems}
        options={oems.map((o) => ({ value: o, label: o }))}
        onToggle={(v) => toggle("oems", v)}
      />
      <FilterMenu
        label="Hosting"
        active={filters.hostings}
        options={hostings.map((h) => ({ value: h, label: h }))}
        onToggle={(v) => toggle("hostings", v)}
      />
      <FilterMenu
        label="Cause"
        active={filters.causes}
        options={CAUSE_ORDER.map((c) => ({ value: c, label: CAUSES[c].label }))}
        onToggle={(v) => toggle("causes", v)}
      />

      {!isEmpty && (
        <Button variant="ghost" size="sm" onClick={clear} className="h-8 text-xs">
          <X className="h-3 w-3 mr-1" />
          Clear ({activeCount})
        </Button>
      )}
    </div>
  );
}

interface FilterMenuProps<T extends string> {
  label: string;
  active: T[];
  options: { value: T; label: string }[];
  onToggle: (v: T) => void;
}

function FilterMenu<T extends string>({ label, active, options, onToggle }: FilterMenuProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <Filter className="h-3 w-3" />
          {label}
          {active.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
              {active.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">No options</div>
        )}
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.value}
            checked={active.includes(opt.value)}
            onCheckedChange={() => onToggle(opt.value)}
            onSelect={(e) => e.preventDefault()}
            className="text-xs"
          >
            {opt.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
