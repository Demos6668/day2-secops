import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Building2, Search } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Input } from "@/components/ui/input";
import { OemMark } from "@/components/Brand";
import { getRagToken } from "@/lib/rag-tokens";
import { useFeeder } from "@/components/Feeder";
import { cn, formatRelative } from "@/lib/utils";
import type { RagStatus, Tool } from "@/types/tool";

interface OemRow {
  oem: string;
  tools: Tool[];
  observed: number;
  denom: number;
  worstStatus: RagStatus;
  lastSync: string;
}

function aggregate(tools: Tool[]): OemRow[] {
  const map = new Map<string, OemRow>();
  for (const t of tools) {
    const cur =
      map.get(t.oem) ??
      ({
        oem: t.oem,
        tools: [],
        observed: 0,
        denom: 0,
        worstStatus: "green",
        lastSync: t.lastSync,
      } as OemRow);
    cur.tools.push(t);
    cur.observed += t.observed;
    cur.denom += t.denominator;
    if (t.status === "red") cur.worstStatus = "red";
    else if (t.status === "amber" && cur.worstStatus !== "red") cur.worstStatus = "amber";
    if (new Date(t.lastSync).getTime() > new Date(cur.lastSync).getTime())
      cur.lastSync = t.lastSync;
    map.set(t.oem, cur);
  }
  const rank: Record<RagStatus, number> = { red: 0, amber: 1, green: 2 };
  return Array.from(map.values()).sort(
    (a, b) => rank[a.worstStatus] - rank[b.worstStatus] || a.oem.localeCompare(b.oem),
  );
}

const STRIPE: Record<RagStatus, string> = {
  red: "lstripe-red",
  amber: "lstripe-amber",
  green: "lstripe-green",
};

export default function OemsOverview() {
  const { tools } = useFeeder();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const all = aggregate(tools);
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter(
      (r) =>
        r.oem.toLowerCase().includes(q) ||
        r.tools.some((t) => t.solution.toLowerCase().includes(q)),
    );
  }, [tools, query]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tool Landscape — by OEM"
        icon={Building2}
        description="Every vendor in this workspace, ranked worst-first. Click a vendor for the full OEM page."
        breadcrumb={[{ label: "Tool Landscape" }, { label: "by OEM" }]}
        meta={`${rows.length} vendors`}
      />

      <Card className="glass-panel">
        <CardContent className="p-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by OEM or solution name…"
            className="h-8 max-w-md text-xs"
            aria-label="Filter OEMs"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map((r) => {
          const pct = r.denom > 0 ? (r.observed / r.denom) * 100 : 0;
          const color = getRagToken(r.worstStatus).hex;
          return (
            <Link
              key={r.oem}
              href={`/oems/${encodeURIComponent(r.oem)}`}
              className={cn(
                "block rounded-lg border hairline bg-card hover:bg-card/80 transition-colors",
                STRIPE[r.worstStatus],
              )}
            >
              <div className="p-3 flex items-start gap-3">
                <OemMark oem={r.oem} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{r.oem}</div>
                  <div className="text-[11px] font-mono text-muted-foreground tabular-nums truncate">
                    {r.tools.length} {r.tools.length === 1 ? "tool" : "tools"} ·{" "}
                    <span
                      style={{ color }}
                      aria-label={`${pct.toFixed(1)}% visible, status ${r.worstStatus.toUpperCase()}`}
                    >
                      {pct.toFixed(1)}% visible
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">
                    last sync {formatRelative(r.lastSync)}
                  </div>
                </div>
              </div>
              <ul className="border-t hairline-t divide-y divide-white/5">
                {r.tools.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between px-3 py-1.5 text-[11px]"
                  >
                    <span className="truncate">{t.solution}</span>
                    <span
                      className="font-mono tabular-nums"
                      style={{ color: getRagToken(t.status).hex }}
                    >
                      {((t.observed / Math.max(1, t.denominator)) * 100).toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
