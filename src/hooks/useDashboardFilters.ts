import { useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import type { RagStatus, Severity, Tower, VisibilityCauseFlag } from "@/types/tool";

export interface DashboardFilters {
  severities: Severity[];
  towers: Tower[];
  statuses: RagStatus[];
  oems: string[];
  hostings: string[];
  causes: VisibilityCauseFlag[];
  query: string;
}

const EMPTY: DashboardFilters = {
  severities: [],
  towers: [],
  statuses: [],
  oems: [],
  hostings: [],
  causes: [],
  query: "",
};

function parseList<T extends string>(raw: string | null, allowed?: readonly T[]): T[] {
  if (!raw) return [];
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as T[];
  if (!allowed) return parts;
  const ok = new Set<string>(allowed);
  return parts.filter((p) => ok.has(p));
}

const SEVERITY_VALUES = ["Critical", "Moderate", "Low"] as const;
const TOWER_VALUES = [
  "Endpoint Security",
  "Application Security",
  "Network Security",
  "Data Security",
  "Identity Security",
] as const;
const STATUS_VALUES = ["green", "amber", "red"] as const;
const CAUSE_VALUES = [
  "agent_absent",
  "agent_silent",
  "coverage_gap",
  "policy_drift",
  "telemetry_blocked",
  "stale_data",
  "eol_unsupported",
  "decommission_ghost",
] as const;

function parseFromSearch(searchString: string): DashboardFilters {
  const p = new URLSearchParams(searchString);
  return {
    severities: parseList(p.get("severity"), SEVERITY_VALUES),
    towers: parseList(p.get("tower"), TOWER_VALUES),
    statuses: parseList(p.get("status"), STATUS_VALUES),
    oems: parseList(p.get("oem")),
    hostings: parseList(p.get("hosting")),
    causes: parseList(p.get("cause"), CAUSE_VALUES),
    query: p.get("q") ?? "",
  };
}

function build(filters: DashboardFilters): string {
  const p = new URLSearchParams();
  if (filters.severities.length) p.set("severity", filters.severities.join(","));
  if (filters.towers.length) p.set("tower", filters.towers.join(","));
  if (filters.statuses.length) p.set("status", filters.statuses.join(","));
  if (filters.oems.length) p.set("oem", filters.oems.join(","));
  if (filters.hostings.length) p.set("hosting", filters.hostings.join(","));
  if (filters.causes.length) p.set("cause", filters.causes.join(","));
  if (filters.query) p.set("q", filters.query);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function useDashboardFilters() {
  const [location] = useLocation();
  const searchString = useSearch();
  const filters = useMemo(() => parseFromSearch(searchString), [searchString]);

  const setFilters = useCallback(
    (next: DashboardFilters | ((prev: DashboardFilters) => DashboardFilters)) => {
      const resolved = typeof next === "function" ? next(parseFromSearch(searchString)) : next;
      const qs = build(resolved);
      // Use history.replaceState — keeps URL synced without polluting nav stack.
      window.history.replaceState(null, "", location + qs);
      // Force wouter to re-read by emitting popstate.
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [location, searchString],
  );

  const toggle = useCallback(
    <K extends keyof DashboardFilters>(
      key: K,
      value: DashboardFilters[K] extends (infer V)[] ? V : never,
    ) => {
      setFilters((prev) => {
        const list = prev[key] as string[];
        const has = list.includes(value as unknown as string);
        const nextList = has ? list.filter((v) => v !== value) : [...list, value];
        return { ...prev, [key]: nextList } as DashboardFilters;
      });
    },
    [setFilters],
  );

  const clear = useCallback(() => setFilters(EMPTY), [setFilters]);

  const isEmpty =
    filters.severities.length === 0 &&
    filters.towers.length === 0 &&
    filters.statuses.length === 0 &&
    filters.oems.length === 0 &&
    filters.hostings.length === 0 &&
    filters.causes.length === 0 &&
    !filters.query;

  return { filters, setFilters, toggle, clear, isEmpty };
}
