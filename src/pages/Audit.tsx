import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Download, ShieldCheck, FileText } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/shared";
import { CombinedCoverage, ControlMatrix } from "@/components/Audit";
import { useWorkspace } from "@/lib/workspace";
import { useFeeder } from "@/components/Feeder";

const COMBINED_TAB = "__combined__";

export default function Audit() {
  const { frameworks } = useWorkspace();
  const { tools } = useFeeder();
  const [matched, params] = useRoute<{ framework?: string }>("/audit/by-framework/:framework");
  const [, setLocation] = useLocation();
  const initial = matched && params?.framework ? params.framework : COMBINED_TAB;
  const [tab, setTab] = useState(initial);

  useEffect(() => {
    setTab(initial);
  }, [initial]);

  const selectFramework = (fwId: string) => {
    setTab(fwId);
    setLocation(
      fwId === COMBINED_TAB ? "/audit/by-framework" : `/audit/by-framework/${fwId}`,
    );
  };

  const orderedTools = useMemo(
    () =>
      [...tools].sort(
        (a, b) => a.tower.localeCompare(b.tower) || a.solution.localeCompare(b.solution),
      ),
    [tools],
  );

  const exportNotice = () =>
    alert("PDF / XLSX export is a Phase-5 placeholder — no real generator wired yet.");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit"
        icon={ShieldCheck}
        description="Cross-framework control coverage mapped to ABCL tools. Click any cell for evidence + rationale."
        meta={`${frameworks.length} frameworks`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportNotice}>
              <Download className="h-3 w-3 mr-1.5" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportNotice}>
              <FileText className="h-3 w-3 mr-1.5" />
              Export XLSX
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
              = <strong>partial</strong>; anchor-less control =<strong> gap</strong>. Phase-real
              swaps this heuristic for the auditor-curated mapping.
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
