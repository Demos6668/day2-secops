import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  Download,
  ShieldCheck,
  FileText,
  Package,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/Common/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/shared";
import { CombinedCoverage, ControlMatrix } from "@/components/Audit";
import { useWorkspace } from "@/lib/workspace";
import { useFeeder } from "@/components/Feeder";
import { downloadPdf, downloadXlsx, downloadAuditPackZip } from "@/lib/audit/exports";
import { controlCoverageDrift, type ControlDrift } from "@/lib/audit/drift";
import { listSnapshots, getSnapshot } from "@/lib/change/snapshots";
import { AuditChecklistsFileSchema } from "@/types/audit-checklists";
import checklistsRaw from "../../workspaces/abcl/audit-checklists.json";
import { cn } from "@/lib/utils";

const CHECKLISTS = AuditChecklistsFileSchema.safeParse(checklistsRaw).success
  ? AuditChecklistsFileSchema.parse(checklistsRaw).checklists
  : [];

const COMBINED_TAB = "__combined__";

export default function Audit() {
  const { frameworks, config } = useWorkspace();
  const { tools } = useFeeder();
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | "zip" | null>(null);
  const [matched, params] = useRoute<{ framework?: string }>("/audit/by-framework/:framework");
  const [, setLocation] = useLocation();
  const initial = matched && params?.framework ? params.framework : COMBINED_TAB;
  const [tab, setTab] = useState(initial);

  useEffect(() => {
    setTab(initial);
  }, [initial]);

  const selectFramework = (fwId: string) => {
    setTab(fwId);
    setLocation(fwId === COMBINED_TAB ? "/audit/by-framework" : `/audit/by-framework/${fwId}`);
  };

  const orderedTools = useMemo(
    () =>
      [...tools].sort(
        (a, b) => a.tower.localeCompare(b.tower) || a.solution.localeCompare(b.solution),
      ),
    [tools],
  );

  // Coverage drift between the last two snapshots (if any).
  const drift = useMemo<ControlDrift[]>(() => {
    const snaps = listSnapshots();
    if (snaps.length < 2) return [];
    const after = getSnapshot(snaps[0].id);
    const before = getSnapshot(snaps[1].id);
    if (!after || !before) return [];
    return controlCoverageDrift(before, after, frameworks);
  }, [frameworks, tools]);

  const handleExport = async (kind: "xlsx" | "pdf" | "zip") => {
    setExporting(kind);
    try {
      if (kind === "xlsx") {
        await downloadXlsx(frameworks, orderedTools);
        toast.success("Control matrix XLSX downloaded.");
      } else if (kind === "pdf") {
        await downloadPdf(frameworks, orderedTools, config.name);
        toast.success("Audit report PDF downloaded.");
      } else {
        await downloadAuditPackZip(frameworks, orderedTools, config.name, CHECKLISTS);
        toast.success("Audit pack ZIP downloaded.");
      }
    } catch (e) {
      toast.error("Export failed", { description: (e as Error).message });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit"
        icon={ShieldCheck}
        description="Cross-framework control coverage mapped to the workspace's tools. Click any cell for evidence + rationale."
        meta={`${frameworks.length} frameworks`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("pdf")}
              disabled={exporting !== null}
            >
              <Download className="h-3 w-3 mr-1.5" />
              {exporting === "pdf" ? "Building…" : "Export PDF"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("xlsx")}
              disabled={exporting !== null}
            >
              <FileText className="h-3 w-3 mr-1.5" />
              {exporting === "xlsx" ? "Building…" : "Export XLSX"}
            </Button>
            <Button size="sm" onClick={() => handleExport("zip")} disabled={exporting !== null}>
              <Package className="h-3 w-3 mr-1.5" />
              {exporting === "zip" ? "Bundling…" : "Audit pack"}
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={selectFramework}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value={COMBINED_TAB} className="text-xs">
            Combined Coverage
          </TabsTrigger>
          {frameworks.map((f) => (
            <TabsTrigger key={f.id} value={f.id} className="text-xs">
              {f.shortName}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={COMBINED_TAB} className="mt-4 space-y-4">
          <CombinedCoverage
            frameworks={frameworks}
            tools={orderedTools}
            onPickFramework={selectFramework}
          />

          {drift.length > 0 && (
            <Card className="glass-panel">
              <CardContent className="p-4 space-y-2.5">
                <header className="flex items-baseline justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Activity
                      className="h-3.5 w-3.5 text-[#B45309] dark:text-[#F59E0B]"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-semibold">Coverage drift since last snapshot</h3>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {drift.length} control{drift.length === 1 ? "" : "s"} flipped
                  </span>
                </header>
                <ul className="divide-y divide-white/5">
                  {drift.map((d) => {
                    const Icon = d.delta < 0 ? TrendingDown : d.delta > 0 ? TrendingUp : Activity;
                    const tone =
                      d.delta < 0
                        ? "text-[#B91C1C] dark:text-[#F87171]"
                        : d.delta > 0
                          ? "text-[#15803D] dark:text-[#4ADE80]"
                          : "text-muted-foreground";
                    return (
                      <li
                        key={`${d.frameworkId}/${d.controlId}`}
                        className="py-2 flex items-center gap-3 text-xs"
                      >
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", tone)} aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/controls/${d.frameworkId}/${d.controlId}`}
                            className="font-medium hover:text-primary"
                          >
                            {d.controlTitle}
                          </Link>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {d.frameworkShort} · {d.controlId}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {d.before} → {d.after}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card className="glass-panel">
            <CardContent className="p-4 text-[11px] text-muted-foreground">
              Coverage is derived from the framework's anchor-tool list intersected with each tool's
              current RAG status. Anchored + healthy = <strong>covered</strong>; anchored + degraded
              = <strong>partial</strong>; anchor-less control = <strong>gap</strong>.
            </CardContent>
          </Card>
        </TabsContent>

        {frameworks.map((f) => (
          <TabsContent key={f.id} value={f.id} className="mt-4 space-y-4">
            <header className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-lg font-semibold">{f.name}</h2>
              <span className="text-[11px] font-mono text-muted-foreground">
                {f.controls.length} controls · {orderedTools.length} tools
              </span>
            </header>
            <ControlMatrix framework={f} tools={orderedTools} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
