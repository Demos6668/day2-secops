import { Link } from "wouter";
import { Boxes, Plus } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/shared";
import { Badge } from "@/components/ui/badge";
import { OemMark } from "@/components/Brand";
import { RagBadge } from "@/components/Common/RagBadge";
import { useFeeder } from "@/components/Feeder";
import { cn } from "@/lib/utils";
import type { RagStatus, Severity } from "@/types/tool";

const SEVERITY_TONE: Record<Severity, string> = {
  Critical: "text-[#F87171] border-[#EF4444]/35 bg-[#EF4444]/10",
  Moderate: "text-[#F59E0B] border-[#B45309]/35 bg-[#B45309]/10",
  Low: "text-muted-foreground border-muted-foreground/25 bg-muted/30",
};

const STATUS_STRIPE: Record<RagStatus, string> = {
  red: "lstripe-red",
  amber: "lstripe-amber",
  green: "lstripe-green",
};

export default function ToolInventory() {
  const { tools } = useFeeder();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tool Inventory"
        icon={Boxes}
        description="Every security tool tracked in this workspace. Click a row to drill into the OEM-native view."
        meta={`${tools.length} tools`}
        breadcrumb={[{ label: "Tool Inventory" }]}
        actions={
          <Button asChild size="sm">
            <Link href="/tools/new">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Tool
            </Link>
          </Button>
        }
      />
      <Card className="glass-panel">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground border-b hairline-b">
              <tr>
                <th className="text-left pl-4 pr-2 py-2.5"></th>
                <th className="text-left px-3 py-2.5">Solution</th>
                <th className="text-left px-3 py-2.5">Tower</th>
                <th className="text-left px-3 py-2.5">Severity</th>
                <th className="text-left px-3 py-2.5">Status</th>
                <th className="text-left px-3 py-2.5">Hosting</th>
                <th className="text-right px-4 py-2.5">Observed / Denom</th>
                <th className="text-right pr-4 pl-2 py-2.5">Visibility</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t) => {
                const pct = (t.observed / Math.max(1, t.denominator)) * 100;
                return (
                  <tr
                    key={t.id}
                    className={cn(
                      "border-b hairline-b last:border-0 hover:bg-white/[0.03] transition-colors",
                      STATUS_STRIPE[t.status],
                    )}
                  >
                    <td className="pl-4 pr-2 py-2.5">
                      <OemMark oem={t.oem} size={26} />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/tools/${t.id}`} className="font-medium hover:text-primary">
                        {t.solution}
                      </Link>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        <Link
                          href={`/oems/${encodeURIComponent(t.oem)}`}
                          className="hover:text-primary"
                        >
                          {t.oem}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-[10px]">
                        {t.tower}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-px text-[10px] font-semibold uppercase tracking-wider",
                          SEVERITY_TONE[t.severity],
                        )}
                      >
                        {t.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <RagBadge status={t.status} />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs truncate max-w-[14rem]">
                      {t.hosting}
                    </td>
                    <td className="px-4 py-2.5 text-right text-num tabular-nums text-xs">
                      {t.observed.toLocaleString()} / {t.denominator.toLocaleString()}
                    </td>
                    <td className="pr-4 pl-2 py-2.5 text-right text-num tabular-nums">
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
