import { Link, useRoute } from "wouter";
import { Building2, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { EmptyState } from "@/components/Common/EmptyState";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { RagBadge } from "@/components/Common/RagBadge";
import { CoverageRing } from "@/components/Dashboard/CoverageRing";
import { WorstNLeaderboard } from "@/components/Dashboard";
import { OemMark } from "@/components/Brand";
import { useFeeder } from "@/components/Feeder";
import { oemRollup } from "@/lib/graph";
import type { RagStatus } from "@/types/tool";

function pickOverallStatus(red: number, amber: number, _green: number): RagStatus {
  if (red > 0) return "red";
  if (amber > 0) return "amber";
  return "green";
}

export default function OemDetail() {
  const [, params] = useRoute<{ oem?: string }>("/oems/:oem");
  const oem = params?.oem ? decodeURIComponent(params.oem) : undefined;
  const { tools } = useFeeder();

  if (!oem) {
    return (
      <div className="space-y-6">
        <PageHeader title="OEM" icon={Building2} />
        <EmptyState title="Bad route" description="Missing OEM name." />
      </div>
    );
  }

  const roll = oemRollup(tools, oem);
  if (roll.tools.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={oem} icon={Building2} />
        <EmptyState
          title="No tools from this OEM"
          description={`"${oem}" isn't represented in this workspace right now.`}
        />
      </div>
    );
  }

  const overall = pickOverallStatus(roll.redCount, roll.amberCount, roll.greenCount);

  return (
    <div className="space-y-6">
      <PageHeader
        title={oem}
        icon={Building2}
        description="Vendor-scoped view — every tool this OEM provides, with a combined coverage roll-up."
        meta={`${roll.tools.length} tool${roll.tools.length === 1 ? "" : "s"}`}
        breadcrumb={[{ label: "OEMs" }, { label: oem }]}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/tools">
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              All tools
            </Link>
          </Button>
        }
      />

      <Card className="glass-panel brand-glow">
        <CardContent className="p-4 flex items-center gap-5">
          <OemMark oem={oem} size={56} />
          <CoverageRing value={roll.visibilityPct} status={overall} size={88} thickness={9} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Combined visibility
            </div>
            <div className="text-[1.75rem] font-bold leading-tight text-num tabular-nums">
              {(roll.visibilityPct * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] font-mono text-muted-foreground mt-1">
              {roll.redCount} red · {roll.amberCount} amber · {roll.greenCount} green
            </div>
          </div>
        </CardContent>
      </Card>

      {roll.tools.length > 1 && (
        <WorstNLeaderboard
          tools={roll.tools}
          n={Math.min(5, roll.tools.length)}
          title={`Worst-ranked ${oem} tools`}
          description="Ranks this vendor's tools by composite risk weight."
        />
      )}

      <Card className="glass-panel">
        <CardContent className="p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Tools by {oem}
          </div>
          <ul className="divide-y divide-white/5">
            {roll.tools.map((t) => (
              <li key={t.id} className="py-2 flex items-center gap-3 text-xs">
                <RagBadge status={t.status} showLabel={false} />
                <div className="flex-1 min-w-0">
                  <Link href={`/tools/${t.id}`} className="font-medium hover:text-primary">
                    {t.solution}
                  </Link>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {t.tower} · {t.severity} · {t.hosting}
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
    </div>
  );
}
