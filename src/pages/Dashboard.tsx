import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  type LucideIcon,
  Cpu,
  Shield,
  Network,
  Database,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import {
  DashboardFiltersBar,
  EstateAtRisk,
  OemSmallMultiples,
  ScoreBreakdownDrawer,
  SecurityScoringPanel,
  TopStrip,
  TowerPillar,
} from "@/components/Dashboard";
import { CauseLegend } from "@/components/Dashboard/CauseLegend";
import { FeederStatusPill, useFeeder } from "@/components/Feeder";
import { useWorkspace, listWorkspaces } from "@/lib/workspace";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { TOWER_FRESHNESS_KEY, type Tool, type Tower } from "@/types/tool";

const TOWER_ICON: Record<Tower, LucideIcon> = {
  "Endpoint Security": Cpu,
  "Application Security": Shield,
  "Network Security": Network,
  "Data Security": Database,
  "Identity Security": UserCheck,
};

const ALL_TOWERS: Tower[] = [
  "Endpoint Security",
  "Application Security",
  "Network Security",
  "Data Security",
  "Identity Security",
];

export default function Dashboard() {
  const { config } = useWorkspace();
  const workspaces = useMemo(() => listWorkspaces(), []);
  const { filters } = useDashboardFilters();
  const [openTool, setOpenTool] = useState<Tool | null>(null);

  const { tools: allTools, towerAlerts } = useFeeder();

  const filteredTools = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return allTools.filter((t) => {
      if (filters.severities.length && !filters.severities.includes(t.severity)) return false;
      if (filters.towers.length && !filters.towers.includes(t.tower)) return false;
      if (filters.statuses.length && !filters.statuses.includes(t.status)) return false;
      if (filters.oems.length && !filters.oems.includes(t.oem)) return false;
      if (filters.hostings.length && !filters.hostings.includes(t.hosting)) return false;
      if (filters.causes.length && !filters.causes.some((c) => t.causes.includes(c))) return false;
      if (q) {
        const hay = `${t.solution} ${t.oem}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allTools, filters]);

  // Tower visibility — when a filter is active, hide non-matching pillars.
  const visibleTowers: Tower[] =
    filters.towers.length > 0 ? ALL_TOWERS.filter((t) => filters.towers.includes(t)) : ALL_TOWERS;
  const pillarCount = visibleTowers.length;
  const pillarGridCols =
    pillarCount === 1
      ? "grid-cols-1"
      : pillarCount === 2
        ? "grid-cols-1 md:grid-cols-2"
        : pillarCount === 3
          ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
          : pillarCount === 4
            ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
            : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5";
  const expandedPillar = pillarCount === 1;
  const totalAssetsTracked = Object.values(config.denominators).reduce((a, b) => a + b, 0);

  const oems = useMemo(() => Array.from(new Set(allTools.map((t) => t.oem))).sort(), [allTools]);
  const hostings = useMemo(
    () => Array.from(new Set(allTools.map((t) => t.hosting))).sort(),
    [allTools],
  );

  useEffect(() => {
    if (!openTool) return;
    const fresh = allTools.find((t) => t.id === openTool.id);
    if (fresh && fresh !== openTool) setOpenTool(fresh);
  }, [allTools, openTool]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tool Landscape — by Security Tower"
        icon={LayoutDashboard}
        description="Coverage health across the five security towers. Of the assets each tool is supposed to see — how many is it actually seeing?"
        meta={
          filteredTools.length !== allTools.length
            ? `${filteredTools.length} / ${allTools.length} tools`
            : `${allTools.length} tools`
        }
        actions={<FeederStatusPill />}
      />

      <TopStrip
        workspace={{ id: config.id, name: config.name }}
        workspaces={workspaces}
        tools={allTools}
        totalAssetsTracked={totalAssetsTracked}
      />

      <EstateAtRisk tools={filteredTools} onOpen={(t) => setOpenTool(t)} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SecurityScoringPanel tools={filteredTools} workspaceConfig={config} n={6} />
        <OemSmallMultiples tools={filteredTools} />
      </div>

      <DashboardFiltersBar oems={oems} hostings={hostings} />

      <div className={`grid ${pillarGridCols} gap-4`}>
        {visibleTowers.map((tower) => (
          <TowerPillar
            key={tower}
            tower={tower}
            icon={TOWER_ICON[tower]}
            tools={filteredTools.filter((t) => t.tower === tower)}
            onOpen={(t) => setOpenTool(t)}
            alertPulse={towerAlerts[tower]}
            expanded={expandedPillar}
          />
        ))}
      </div>

      <CauseLegend />

      <ScoreBreakdownDrawer
        tool={openTool}
        freshnessSloHours={
          openTool ? config.freshnessSloHours[TOWER_FRESHNESS_KEY[openTool.tower]] : 24
        }
        onOpenChange={(open) => !open && setOpenTool(null)}
      />
    </div>
  );
}
