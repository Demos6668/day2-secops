import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  Camera,
  GitCompareArrows,
  Trash2,
  ArrowRight,
  Boxes,
  Activity,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/Common/EmptyState";
import {
  captureSnapshot,
  deleteSnapshot,
  diffSnapshots,
  getSnapshot,
  listSnapshots,
  pruneOlderThan,
  type SnapshotMeta,
  type ToolDiff,
} from "@/lib/change/snapshots";
import { useFeeder } from "@/components/Feeder";
import { useWorkspace } from "@/lib/workspace";
import { cn, formatRelative } from "@/lib/utils";
import { WorstNLeaderboard } from "@/components/Dashboard";

const DIFF_TONE: Record<ToolDiff["kind"], string> = {
  added: "border-[#22C55E]/30 text-[#22C55E] bg-[#22C55E]/10",
  removed: "border-[#EF4444]/30 text-[#EF4444] bg-[#EF4444]/10",
  status_changed: "border-[#D97706]/30 text-[#D97706] bg-[#D97706]/10",
  severity_changed: "border-primary/30 text-primary bg-primary/10",
  coverage_shifted: "border-border text-foreground bg-muted/40",
  causes_changed: "border-border text-foreground bg-muted/40",
};

const DIFF_ICON: Record<ToolDiff["kind"], typeof Boxes> = {
  added: Boxes,
  removed: Trash2,
  status_changed: ShieldAlert,
  severity_changed: ShieldAlert,
  coverage_shifted: Activity,
  causes_changed: Activity,
};

export default function ChangeManagement() {
  const { tools } = useFeeder();
  const { config } = useWorkspace();
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>(() => listSnapshots());
  const [matched, params] = useRoute<{ snapshotId?: string }>("/change/:snapshotId");
  const [, setLocation] = useLocation();

  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  useEffect(() => {
    if (matched && params?.snapshotId) setCompareB(params.snapshotId);
  }, [matched, params?.snapshotId]);

  const refresh = () => setSnapshots(listSnapshots());

  const handleCapture = () => {
    const snap = captureSnapshot(tools, { trigger: "manual" });
    refresh();
    setCompareB(snap.id);
  };

  const handlePrune = () => {
    const removed = pruneOlderThan(config.snapshotRetentionDays);
    refresh();
    alert(
      `Pruned ${removed} snapshot${removed === 1 ? "" : "s"} older than ${config.snapshotRetentionDays} days.`,
    );
  };

  const handleDelete = (id: string) => {
    deleteSnapshot(id);
    if (compareA === id) setCompareA(null);
    if (compareB === id) setCompareB(null);
    refresh();
  };

  const diffs = useMemo<ToolDiff[]>(() => {
    if (!compareA || !compareB || compareA === compareB) return [];
    const a = getSnapshot(compareA);
    const b = getSnapshot(compareB);
    if (!a || !b) return [];
    return diffSnapshots(a, b);
  }, [compareA, compareB]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Change Management"
        icon={GitCompareArrows}
        description={`Snapshot the inventory state and diff between any two points in time. Retention: ${config.snapshotRetentionDays} days.`}
        meta={`${snapshots.length} snapshot${snapshots.length === 1 ? "" : "s"}`}
        breadcrumb={[{ label: "Change Management" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={handleCapture} size="sm">
              <Camera className="h-3 w-3 mr-1.5" />
              Capture now
            </Button>
            <Button onClick={handlePrune} size="sm" variant="outline">
              <Trash2 className="h-3 w-3 mr-1.5" />
              Prune
            </Button>
          </div>
        }
      />

      <WorstNLeaderboard
        tools={tools}
        n={5}
        title="Highest-risk tools right now"
        description="Capture a snapshot when one of these flips green; that's the change worth recording."
      />

      <Card className="glass-panel">
        <CardContent className="p-4">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-3">
            Snapshots
          </div>
          {snapshots.length === 0 ? (
            <EmptyState
              title="No snapshots yet"
              description="Click 'Capture now' to record the current state. Phase 5 wires a daily scheduled capture."
            />
          ) : (
            <ul className="divide-y divide-white/5">
              {snapshots.map((s) => (
                <li key={s.id} className="py-2 flex items-center gap-3 text-xs flex-wrap">
                  <div className="flex-1 min-w-[10rem]">
                    <div className="font-mono text-[10px] text-muted-foreground">{s.id}</div>
                    <div className="text-xs">{s.label ?? "Untitled snapshot"}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatRelative(s.takenAt)} · {s.trigger} · source {s.source}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant={compareA === s.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCompareA(s.id === compareA ? null : s.id)}
                    >
                      A
                    </Button>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Button
                      variant={compareB === s.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setCompareB(s.id === compareB ? null : s.id);
                        setLocation(s.id === compareB ? "/change" : `/change/${s.id}`);
                      }}
                    >
                      B
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {compareA && compareB && compareA !== compareB && (
        <Card className="glass-panel">
          <CardContent className="p-4 space-y-3">
            <header className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                Diff
              </div>
              <Badge variant="outline" className="text-[10px]">
                {diffs.length} change{diffs.length === 1 ? "" : "s"}
              </Badge>
            </header>
            {diffs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Snapshots are identical for the fields we track.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {diffs.map((d, i) => {
                  const Icon = DIFF_ICON[d.kind];
                  return (
                    <li
                      key={i}
                      className={cn(
                        "flex items-start gap-2 rounded border px-2.5 py-1.5",
                        DIFF_TONE[d.kind],
                      )}
                    >
                      <Icon className="h-3 w-3 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium">
                            <Link href={`/tools/${d.toolId}`}>{d.solution}</Link>
                          </span>
                          <span className="font-mono uppercase text-[9px] tracking-widest">
                            {d.kind.replace("_", " ")}
                          </span>
                        </div>
                        {d.detail && <div className="text-[11px] mt-0.5 font-mono">{d.detail}</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
