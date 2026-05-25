import { useMemo } from "react";
import { Radar, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/utils";
import insintRaw from "../../workspaces/abcl/insint.json";
import { InsintFileSchema, type InsintCve } from "@/types/insint";

const SEVERITY_TONE: Record<InsintCve["severity"], string> = {
  Critical: "text-[#F87171] border-[#EF4444]/40 bg-[#EF4444]/10",
  High: "text-[#F59E0B] border-[#B45309]/40 bg-[#B45309]/10",
  Medium: "text-[#FBBF24] border-[#D97706]/30 bg-[#D97706]/10",
  Low: "text-muted-foreground border-muted-foreground/30 bg-muted/30",
};

const INSINT_DATA = InsintFileSchema.parse(insintRaw);

export default function VulnInsint() {
  const data = INSINT_DATA;

  const totalFindings = useMemo(() => {
    return data.sources.reduce(
      (acc, s) => ({
        critical: acc.critical + s.findings.critical,
        high: acc.high + s.findings.high,
        medium: acc.medium + s.findings.medium,
        low: acc.low + s.findings.low,
      }),
      { critical: 0, high: 0, medium: 0, low: 0 },
    );
  }, [data]);

  const totalHosts = data.sources.reduce((a, s) => a + s.hostsScanned, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vuln Mgmt — INSINT (Internal VA)"
        icon={Radar}
        description="Internal vulnerability assessment data from on-prem scanners (Nessus, OpenVAS) and custom Day2 agents. Aggregates findings, top CVEs, and agent coverage."
        breadcrumb={[{ label: "Vuln Mgmt" }, { label: "INSINT" }]}
        meta={`${data.sources.length} sources`}
      />

      {/* Top strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Hosts scanned" value={totalHosts.toLocaleString()} />
        <Stat
          label="Critical findings"
          value={totalFindings.critical.toLocaleString()}
          accent="red"
        />
        <Stat label="High findings" value={totalFindings.high.toLocaleString()} accent="amber" />
        <Stat label="Medium findings" value={totalFindings.medium.toLocaleString()} />
      </div>

      {/* Source roll-up */}
      <Card className="glass-panel">
        <CardContent className="p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Scan sources
          </div>
          <ul className="divide-y divide-white/5">
            {data.sources.map((s) => (
              <li key={s.id} className="py-2.5 flex items-center gap-3 text-xs flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {s.kind} · {s.scope} · last scan {formatRelative(s.lastScan)}
                  </div>
                </div>
                <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                  {s.hostsScanned.toLocaleString()} hosts
                </span>
                <SeverityChip label="C" n={s.findings.critical} severity="Critical" />
                <SeverityChip label="H" n={s.findings.high} severity="High" />
                <SeverityChip label="M" n={s.findings.medium} severity="Medium" />
                <SeverityChip label="L" n={s.findings.low} severity="Low" />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top CVEs */}
        <Card className="glass-panel">
          <CardContent className="p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Top CVEs (by affected hosts)
            </div>
            <ul className="divide-y divide-white/5">
              {data.topCves.map((c) => (
                <li key={c.cve} className="py-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px]">{c.cve}</span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider",
                        SEVERITY_TONE[c.severity],
                      )}
                    >
                      {c.severity}
                    </span>
                    <span className="ml-auto text-[10px] font-mono tabular-nums text-muted-foreground">
                      {c.affectedHosts.toLocaleString()} hosts
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.title}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Agent coverage */}
        <Card className="glass-panel">
          <CardContent className="p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Custom agent groups
            </div>
            <ul className="space-y-2">
              {data.agentGroups.map((g) => (
                <li key={g.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-[10px] font-mono tabular-nums">
                      {g.hostCount.toLocaleString()} hosts · {g.compliancePct.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(g.compliancePct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${g.name} compliance ${g.compliancePct.toFixed(1)}%`}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${g.compliancePct}%`,
                        background:
                          g.compliancePct >= 90
                            ? "#22C55E"
                            : g.compliancePct >= 80
                              ? "#D97706"
                              : "#EF4444",
                      }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    last sync {formatRelative(g.lastSync)}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

const ACCENT: Record<"red" | "amber" | "default", string> = {
  red: "border-[#EF4444]/30",
  amber: "border-[#D97706]/30",
  default: "border-white/5",
};

function Stat({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "red" | "amber" | "default";
}) {
  return (
    <Card className={cn("glass-panel border", ACCENT[accent])}>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
          {label}
        </div>
        <div className="text-xl font-bold mt-1 text-num tabular-nums truncate">{value}</div>
      </CardContent>
    </Card>
  );
}

function SeverityChip({
  label,
  n,
  severity,
}: {
  label: string;
  n: number;
  severity: InsintCve["severity"];
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono tabular-nums",
        SEVERITY_TONE[severity],
      )}
      aria-label={`${severity}: ${n.toLocaleString()} findings`}
    >
      <span aria-hidden="true">{label}</span> <span aria-hidden="true">{n.toLocaleString()}</span>
    </span>
  );
}
