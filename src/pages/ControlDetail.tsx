import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  ShieldAlert,
  Activity,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { EmptyState } from "@/components/Common/EmptyState";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RagBadge } from "@/components/Common/RagBadge";
import { OemMark } from "@/components/Brand";
import { LossReasonChips } from "@/components/Dashboard/LossReasonChips";
import { useFeeder } from "@/components/Feeder";
import { useWorkspace } from "@/lib/workspace";
import { findControl } from "@/lib/graph";
import { rollupControl, type CellStatus } from "@/lib/audit/coverage";
import type { RagStatus } from "@/types/tool";

const CELL_TO_RAG: Record<CellStatus, RagStatus> = {
  covered: "green",
  partial: "amber",
  gap: "red",
  na: "red",
};
import { resolveControlImpact, findControlByRef, controlRef } from "@/lib/audit/control-impact";
import { CAUSES } from "@/lib/visibility/causes";
import { cn, formatRelative } from "@/lib/utils";
import type { ConfigChangeRisk } from "@/types/config-changes";

const RISK_TONE: Record<ConfigChangeRisk, string> = {
  safe: "border-[#22C55E]/30 text-[#15803D] dark:text-[#4ADE80] bg-[#22C55E]/10",
  risky: "border-[#B45309]/40 text-[#B45309] dark:text-[#F59E0B] bg-[#B45309]/10",
  dangerous: "border-[#EF4444]/40 text-[#B91C1C] dark:text-[#F87171] bg-[#EF4444]/10",
};

export default function ControlDetail() {
  const [, params] = useRoute<{ framework: string; controlId: string }>(
    "/controls/:framework/:controlId",
  );
  const fwId = params?.framework;
  const ctrlId = params?.controlId;
  const { frameworks } = useWorkspace();
  const { tools } = useFeeder();

  const hit = useMemo(
    () => (fwId && ctrlId ? findControl(frameworks, fwId, ctrlId) : undefined),
    [frameworks, fwId, ctrlId],
  );

  const impact = useMemo(
    () => (hit ? resolveControlImpact(hit.framework.id, hit.control, tools) : undefined),
    [hit, tools],
  );

  if (!fwId || !ctrlId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Control" icon={ShieldCheck} />
        <EmptyState title="Bad route" description="Missing framework or control id." />
      </div>
    );
  }

  if (!hit || !impact) {
    return (
      <div className="space-y-6">
        <PageHeader title="Control" icon={ShieldCheck} />
        <EmptyState
          title="Control not found"
          description={`No "${ctrlId}" in framework "${fwId}".`}
        />
      </div>
    );
  }

  const { framework, control } = hit;
  const roll = rollupControl(control, tools);

  const downloadJson = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            ref: controlRef(framework.id, control.id),
            framework: framework.name,
            control,
            impact: {
              coverage: impact.coverage,
              anchoredTools: impact.anchoredTools.map((t) => ({
                id: t.id,
                solution: t.solution,
                oem: t.oem,
                tower: t.tower,
                status: t.status,
                visibility: t.observed / Math.max(1, t.denominator),
                activeCauses: t.causes,
                activeLossReasons: t.activeLossReasons ?? [],
              })),
              activeCauses: impact.activeCauses,
              recentRiskyChanges: impact.recentRiskyChanges,
              relatedControls: impact.relatedControls.map((r) => ({
                topic: r.correlation.topic,
                refs: r.refs,
              })),
            },
            generatedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${framework.id}-${control.id}-evidence-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={control.title}
        icon={ShieldCheck}
        description={`${framework.name} · ${control.id}`}
        meta={`${impact.anchoredTools.length} anchor tool${impact.anchoredTools.length === 1 ? "" : "s"} · ${roll.overall}`}
        breadcrumb={[
          { label: "Audit", href: "/audit/by-framework" },
          { label: framework.shortName, href: `/audit/by-framework/${framework.id}` },
          { label: control.id },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadJson}>
              <Download className="h-3 w-3 mr-1.5" />
              Export evidence (JSON)
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/audit/by-framework/${framework.id}`}>
                <ArrowLeft className="h-3 w-3 mr-1.5" />
                Back to {framework.shortName}
              </Link>
            </Button>
          </div>
        }
      />

      {/* Coverage rollup chips */}
      <Card className="glass-panel">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <RagBadge status={CELL_TO_RAG[roll.overall]} />
          <span className="text-xs text-muted-foreground">
            {impact.coverage.covered} covered · {impact.coverage.partial} partial ·{" "}
            {impact.anchoredTools.length - impact.coverage.covered - impact.coverage.partial}{" "}
            failing
            {impact.anchoredTools.length === 0 && " — no anchor tool (gap)"}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground ml-auto">
            healthy ratio {(impact.coverage.healthyRatio * 100).toFixed(0)}%
          </span>
        </CardContent>
      </Card>

      {/* Anchor tools */}
      <Card className="glass-panel">
        <CardContent className="p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Anchor tools
          </div>
          {impact.anchoredTools.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No tool currently anchors this control — gap.
            </p>
          ) : (
            <ul className="divide-y divide-white/5 dark:divide-white/5">
              {impact.anchoredTools.map((t) => (
                <li key={t.id} className="py-2 flex items-center gap-3 text-xs">
                  <OemMark oem={t.oem} size={22} />
                  <RagBadge status={t.status} showLabel={false} />
                  <div className="flex-1 min-w-0">
                    <Link href={`/tools/${t.id}`} className="font-medium hover:text-primary">
                      {t.solution}
                    </Link>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      <Link
                        href={`/oems/${encodeURIComponent(t.oem)}`}
                        className="hover:text-primary"
                      >
                        {t.oem}
                      </Link>{" "}
                      · {t.tower} · {t.severity}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {((t.observed / Math.max(1, t.denominator)) * 100).toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Active causes impacting this control */}
      {impact.activeCauses.length > 0 && (
        <Card className="glass-panel">
          <CardContent className="p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-3 w-3 text-[#B91C1C] dark:text-[#F87171]" aria-hidden="true" />
              Active causes degrading this control
            </div>
            <ul className="space-y-1.5">
              {impact.activeCauses.map(({ cause, toolIds }) => {
                const meta = CAUSES[cause];
                return (
                  <li key={cause} className="flex items-start gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase tracking-wider",
                        meta.weight === "High" &&
                          "border-[#EF4444]/40 text-[#B91C1C] dark:text-[#F87171] bg-[#EF4444]/10",
                        meta.weight === "Medium" &&
                          "border-[#B45309]/40 text-[#B45309] dark:text-[#F59E0B] bg-[#B45309]/10",
                        meta.weight === "Low" && "border-muted-foreground/30",
                      )}
                    >
                      {meta.weight}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{meta.label}</div>
                      <div className="text-[11px] text-muted-foreground">{meta.description}</div>
                      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        firing on {toolIds.length} tool{toolIds.length === 1 ? "" : "s"} ·{" "}
                        {toolIds.join(", ")}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Active OEM loss reasons */}
      {impact.activeLossReasons.length > 0 && (
        <Card className="glass-panel">
          <CardContent className="p-4 space-y-2.5">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Active OEM-native loss reasons
            </div>
            <ul className="space-y-2">
              {impact.activeLossReasons.map(({ reason, toolIds }) => {
                const tool = impact.anchoredTools.find((t) => toolIds.includes(t.id));
                return (
                  <li key={`${reason.code}-${toolIds.join(",")}`} className="space-y-1">
                    <LossReasonChips
                      oem={tool?.oem ?? ""}
                      codes={[reason.code]}
                    />
                    <div className="text-[10px] font-mono text-muted-foreground pl-1">
                      on {toolIds.join(", ")}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recent risky config changes affecting anchored tools */}
      {impact.recentRiskyChanges.length > 0 && (
        <Card className="glass-panel">
          <CardContent className="p-4 space-y-2.5">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3 w-3" aria-hidden="true" />
              Recent risky changes affecting anchored tools
            </div>
            <ul className="space-y-1.5">
              {impact.recentRiskyChanges.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-2 text-xs border-b hairline-b last:border-0 pb-1.5"
                >
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] uppercase tracking-wider", RISK_TONE[c.riskClass])}
                  >
                    {c.riskClass === "dangerous" && (
                      <AlertTriangle className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                    )}
                    {c.riskClass}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium leading-snug">{c.summary}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      {c.actor} · {c.toolId} · {formatRelative(c.timestamp)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Related controls in other frameworks */}
      {impact.relatedControls.length > 0 && (
        <Card className="glass-panel">
          <CardContent className="p-4 space-y-2.5">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Related controls in other frameworks
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Closing this control is evidence toward closing its siblings — the same intent
              expressed across different audit frameworks.
            </p>
            {impact.relatedControls.map(({ correlation, refs }) => (
              <div
                key={correlation.id}
                className="rounded border hairline bg-card/70 px-3 py-2 space-y-1.5"
              >
                <div className="flex items-baseline justify-between flex-wrap gap-1">
                  <span className="text-xs font-medium">{correlation.topic}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {refs.length} sibling{refs.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {correlation.description}
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {refs.map((ref) => {
                    const sib = findControlByRef(ref, frameworks);
                    if (!sib) return null;
                    return (
                      <li key={ref}>
                        <Link
                          href={`/controls/${sib.framework.id}/${sib.control.id}`}
                          className="inline-flex items-center gap-1 text-[10px] font-mono rounded border hairline px-1.5 py-0.5 hover:text-primary hover:border-primary/40"
                        >
                          {sib.framework.shortName} · {sib.control.id}
                          <ArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
