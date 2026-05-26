import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Download, ShieldCheck, FileText, Package } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/Common/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/shared";
import { CombinedCoverage, ControlMatrix } from "@/components/Audit";
import { useWorkspace } from "@/lib/workspace";
import { useFeeder } from "@/components/Feeder";
import {
  downloadPdf,
  downloadXlsx,
  downloadAuditPackZip,
} from "@/lib/audit/exports";
import { AuditChecklistsFileSchema } from "@/types/audit-checklists";
import checklistsRaw from "../../workspaces/abcl/audit-checklists.json";

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
            <Button
              size="sm"
              onClick={() => handleExport("zip")}
              disabled={exporting !== null}
            >
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

        <TabsContent value={COMBINED_TAB} className="mt-4">
          <CombinedCoverage
            frameworks={frameworks}
            tools={orderedTools}
            onPickFramework={selectFramework}
          />
          <Card className="mt-4 glass-panel">
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
