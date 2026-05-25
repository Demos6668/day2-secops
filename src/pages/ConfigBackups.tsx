import { useMemo } from "react";
import { Archive, Download, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/Common/EmptyState";
import { OemMark } from "@/components/Brand";
import { useFeeder } from "@/components/Feeder";
import { formatRelative } from "@/lib/utils";

interface BackupRow {
  id: string;
  toolId: string;
  oem: string;
  solution: string;
  takenAt: string;
  bytes: number;
  source: "scheduled" | "manual" | "pre-change";
}

/** Deterministic mock backup catalog — one entry per tool per "yesterday/last week". */
function buildMockBackups(tools: ReturnType<typeof useFeeder>["tools"]): BackupRow[] {
  const out: BackupRow[] = [];
  const now = Date.now();
  for (const t of tools) {
    out.push({
      id: `bk_${t.id}_d1`,
      toolId: t.id,
      oem: t.oem,
      solution: t.solution,
      takenAt: new Date(now - 24 * 3_600_000).toISOString(),
      bytes: 12000 + (t.denominator % 50) * 750,
      source: "scheduled",
    });
    out.push({
      id: `bk_${t.id}_w1`,
      toolId: t.id,
      oem: t.oem,
      solution: t.solution,
      takenAt: new Date(now - 7 * 24 * 3_600_000).toISOString(),
      bytes: 11000 + (t.denominator % 70) * 700,
      source: "scheduled",
    });
  }
  return out.sort((a, b) => (a.takenAt < b.takenAt ? 1 : -1));
}

function bytesLabel(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function ConfigBackups() {
  const { tools } = useFeeder();
  const rows = useMemo(() => buildMockBackups(tools), [tools]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Config Backups"
        icon={Archive}
        description="Point-in-time configuration backups across every onboarded tool. Restore-on-demand workflow lands when a real backup target is wired."
        breadcrumb={[{ label: "Config Mgmt" }, { label: "Backups" }]}
        meta={`${rows.length} backups`}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No backups yet"
          description="Backups will appear here once the scheduled job runs (default: daily)."
        />
      ) : (
        <Card className="glass-panel">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b hairline-b text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                <tr>
                  <th scope="col" className="text-left px-3 py-2">
                    <span className="sr-only">Vendor</span>
                  </th>
                  <th scope="col" className="text-left px-3 py-2">
                    Tool
                  </th>
                  <th scope="col" className="text-left px-3 py-2">
                    Backup ID
                  </th>
                  <th scope="col" className="text-left px-3 py-2">
                    Source
                  </th>
                  <th scope="col" className="text-right px-3 py-2">
                    Size
                  </th>
                  <th scope="col" className="text-right px-3 py-2">
                    Captured
                  </th>
                  <th scope="col" className="px-3 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b hairline-b last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-2">
                      <OemMark oem={b.oem} size={22} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-xs">{b.solution}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{b.oem}</div>
                    </td>
                    <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground">
                      {b.id}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {b.source}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] font-mono tabular-nums">
                      {bytesLabel(b.bytes)}
                    </td>
                    <td className="px-3 py-2 text-right text-[10px] font-mono text-muted-foreground">
                      {formatRelative(b.takenAt)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" className="h-7 text-[10px]" disabled>
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px]" disabled>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card className="glass-panel">
        <CardContent className="p-4 text-[11px] text-muted-foreground">
          <strong>Retention</strong>: 30 days for daily backups, 12 months for weekly snapshots.
          Pre-change backups retained until 7 days after the change is closed.
        </CardContent>
      </Card>
    </div>
  );
}
