import { Link } from "wouter";
import { OemMark } from "@/components/Brand";
import { getRagToken } from "@/lib/rag-tokens";
import { cn } from "@/lib/utils";
import type { RagStatus, Tool } from "@/types/tool";

interface OemSmallMultiplesProps {
  tools: Tool[];
  className?: string;
}

interface OemAgg {
  oem: string;
  toolCount: number;
  visibilityPct: number;
  worstStatus: RagStatus;
}

function aggregateByOem(tools: Tool[]): OemAgg[] {
  const map = new Map<string, { observed: number; denom: number; tools: Tool[] }>();
  for (const t of tools) {
    const a = map.get(t.oem) ?? { observed: 0, denom: 0, tools: [] };
    a.observed += t.observed;
    a.denom += t.denominator;
    a.tools.push(t);
    map.set(t.oem, a);
  }
  const list: OemAgg[] = [];
  for (const [oem, a] of map) {
    let worst: RagStatus = "green";
    for (const t of a.tools) {
      if (t.status === "red") worst = "red";
      else if (t.status === "amber" && worst !== "red") worst = "amber";
    }
    list.push({
      oem,
      toolCount: a.tools.length,
      visibilityPct: a.denom > 0 ? (a.observed / a.denom) * 100 : 0,
      worstStatus: worst,
    });
  }
  const rank: Record<RagStatus, number> = { red: 0, amber: 1, green: 2 };
  return list.sort(
    (a, b) => rank[a.worstStatus] - rank[b.worstStatus] || a.oem.localeCompare(b.oem),
  );
}

/**
 * OEMs at a glance — uniform tiles per vendor. Vendor name visible inline
 * (not just on hover), logo + count + visibility % + worst-status dot.
 */
export function OemSmallMultiples({ tools, className }: OemSmallMultiplesProps) {
  const aggregated = aggregateByOem(tools);
  if (aggregated.length === 0) return null;

  return (
    <section className={cn("space-y-2", className)}>
      <header className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">OEMs at a glance</h3>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {aggregated.length} vendors · worst first
        </span>
      </header>
      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {aggregated.map((a) => {
          const tone = getRagToken(a.worstStatus);
          return (
            <li key={a.oem}>
              <Link
                href={`/oems/${encodeURIComponent(a.oem)}`}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded border hairline bg-card hover:bg-card/80 transition-colors",
                  a.worstStatus === "red" && "lstripe-red",
                  a.worstStatus === "amber" && "lstripe-amber",
                  a.worstStatus === "green" && "lstripe-green",
                )}
                aria-label={`${a.oem} — ${a.toolCount} tools, ${a.worstStatus} worst, ${a.visibilityPct.toFixed(1)}% visibility`}
              >
                <OemMark oem={a.oem} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate leading-tight">{a.oem}</div>
                  <div className="text-[10px] font-mono text-muted-foreground tabular-nums truncate">
                    {a.toolCount} {a.toolCount === 1 ? "tool" : "tools"} ·{" "}
                    {a.visibilityPct.toFixed(0)}% visible
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: tone.hex }}
                  title={a.worstStatus}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
