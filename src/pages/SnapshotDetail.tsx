import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { Camera, ArrowLeft, GitCompareArrows } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { EmptyState } from "@/components/Common/EmptyState";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RagBadge } from "@/components/Common/RagBadge";
import { captureSnapshot, diffSnapshots, getSnapshot, listSnapshots } from "@/lib/change/snapshots";
import { useFeeder } from "@/components/Feeder";
import { cn, formatRelative } from "@/lib/utils";
import { WorstNLeaderboard } from "@/components/Dashboard";

export default function SnapshotDetail() {
  const [, params] = useRoute<{ id?: string }>("/snapshots/:id");
  const snap = params?.id ? getSnapshot(params.id) : undefined;
  const { tools } = useFeeder();

  // Most recent prior snapshot (other than this one) — for "compare to previous".
  const previous = useMemo(() => {
    if (!snap) return undefined;
    return listSnapshots()
      .filter((s) => s.id !== snap.id && s.takenAt < snap.takenAt)
      .sort((a, b) => (a.takenAt < b.takenAt ? 1 : -1))[0];
  }, [snap]);

  const liveDiff = useMemo(() => {
    if (!snap) return [];
    // Synthesize a "current" snapshot to compare against.
    return diffSnapshots(snap, {
      id: "live",
      takenAt: new Date().toISOString(),
      trigger: "live",
      source: "feeder",
      tools,
    });
  }, [snap, tools]);

  if (!snap) {
    return (
      <div className="space-y-6">
        <PageHeader title="Snapshot" icon={Camera} />
        <EmptyState title="Not found" description={`No snapshot with id "${params?.id}".`} />
      </div>
    );
  }

  const denomTotal = snap.tools.reduce((a, t) => a + t.denominator, 0);
  const observedTotal = snap.tools.reduce((a, t) => a + t.observed, 0);
  const visibility = denomTotal > 0 ? (observedTotal / denomTotal) * 100 : 0;
  const counts = snap.tools.reduce(
    (acc, t) => {
      acc[t.status]++;
      return acc;
    },
    { red: 0, amber: 0, green: 0 } as Record<"red" | "amber" | "green", number>,
  );

  const captureNow = () => {
    const s = captureSnapshot(tools, { trigger: "compare-from-detail" });
    window.location.hash = "";
    window.history.pushState(null, "", `/change/${s.id}?a=${snap.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Snapshot"
        icon={Camera}
        description={`Captured ${formatRelative(snap.takenAt)} · ${snap.trigger} · source ${snap.source ?? "—"}`}
        meta={snap.id}
        breadcrumb={[{ label: "Change Management", href: "/change" }, { label: "Snapshot" }]}
        actions={
          <div className="flex items-center gap-2">
            {previous && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/change/${snap.id}?a=${previous.id}`}>
                  <GitCompareArrows className="h-3 w-3 mr-1.5" />
                  vs previous
                </Link>
              </Button>
            )}
            <Button size="sm" onClick={captureNow}>
              <Camera className="h-3 w-3 mr-1.5" />
              Compare to current
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/change">
                <ArrowLeft className="h-3 w-3 mr-1.5" />
                All snapshots
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Tools tracked" value={String(snap.tools.length)} />
        <Stat label="Visibility" value={`${visibility.toFixed(1)}%`} />
        <Stat
          label="Red / amber / green"
          value={`${counts.red} / ${counts.amber} / ${counts.green}`}
        />
        <Stat label="Trigger" value={snap.trigger} />
      </div>

      <WorstNLeaderboard
        tools={snap.tools}
        n={5}
        title="Highest-risk tools at capture"
        description="Composite risk weight at the moment this snapshot was taken."
      />

      <Card className="glass-panel">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              State at capture
            </div>
            <Badge variant="outline" className="text-[10px]">
              {snap.tools.length} tools
            </Badge>
          </div>
          <ul className="divide-y divide-white/5">
            {snap.tools.map((t) => (
              <li key={t.id} className="py-2 flex items-center gap-3 text-xs">
                <RagBadge status={t.status} showLabel={false} />
                <div className="flex-1 min-w-0">
                  <Link href={`/tools/${t.id}`} className="font-medium hover:text-primary">
                    {t.solution}
                  </Link>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {t.oem} · {t.tower} · {t.severity}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                  {((t.observed / Math.max(1, t.denominator)) * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {liveDiff.length > 0 && (
        <Card className="glass-panel">
          <CardContent className="p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Drift vs current
            </div>
            <ul className="space-y-1.5 text-xs">
              {liveDiff.slice(0, 30).map((d, i) => (
                <li key={i} className={cn("font-mono text-[11px]")}>
                  <Link href={`/tools/${d.toolId}`} className="text-foreground hover:text-primary">
                    {d.solution}
                  </Link>{" "}
                  <span className="text-muted-foreground">— {d.kind.replace("_", " ")}</span>
                  {d.detail && <span className="ml-1 text-muted-foreground">· {d.detail}</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="glass-panel">
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
          {label}
        </div>
        <div className="text-xl font-bold mt-0.5 text-num truncate">{value}</div>
      </CardContent>
    </Card>
  );
}
