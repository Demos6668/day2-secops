import { Card, CardContent } from "@/components/ui/shared";
import { cn } from "@/lib/utils";
import { OemMark } from "@/components/Brand";
import type { Stat, ToolDashboardRecipe, Widget } from "@/lib/tool-dashboards/recipes";

interface ToolDashboardProps {
  oem: string;
  recipe: ToolDashboardRecipe;
}

const TONE_TEXT: Record<NonNullable<Stat["tone"]>, string> = {
  ok: "text-[#4ADE80]",
  warn: "text-[#FBBF24]",
  bad: "text-[#F87171]",
  neutral: "text-foreground",
};

export function ToolDashboard({ oem, recipe }: ToolDashboardProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <OemMark oem={oem} size={36} />
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {oem} native view
          </div>
          <h2 className="text-base font-semibold">{recipe.banner}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {recipe.widgets.map((w, i) => (
          <WidgetCard key={`${w.title}-${i}`} widget={w} />
        ))}
      </div>
    </section>
  );
}

function WidgetCard({ widget }: { widget: Widget }) {
  return (
    <Card className="glass-panel">
      <CardContent className="p-4 space-y-3">
        <header>
          <div className="text-sm font-semibold leading-tight">{widget.title}</div>
          {widget.subtitle && (
            <div className="text-[11px] text-muted-foreground mt-0.5">{widget.subtitle}</div>
          )}
        </header>

        {widget.stats && (
          <dl className="space-y-1.5">
            {widget.stats.map((s, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
                <dd
                  className={cn(
                    "text-sm font-mono tabular-nums text-right",
                    TONE_TEXT[s.tone ?? "neutral"],
                  )}
                  title={s.hint}
                >
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {widget.bar && widget.bar.length > 0 && (
          <div className="space-y-2">
            <div className="h-2 rounded-full overflow-hidden flex bg-muted/30">
              {widget.bar.map((seg, i) => (
                <div
                  key={i}
                  style={{ width: `${seg.pct * 100}%`, background: seg.color }}
                  className="h-full transition-[width] duration-300"
                  title={`${seg.label} ${(seg.pct * 100).toFixed(1)}%`}
                />
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-1 text-[10px] font-mono">
              {widget.bar.map((seg) => (
                <li key={seg.label} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ background: seg.color }}
                  />
                  <span className="text-muted-foreground">{seg.label}</span>
                  <span className="ml-auto tabular-nums">{(seg.pct * 100).toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {widget.table && (
          <table className="w-full text-[11px]">
            {widget.table.header && (
              <thead>
                <tr className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                  <th className="text-left py-1">{widget.table.header[0]}</th>
                  <th className="text-right py-1">{widget.table.header[1]}</th>
                </tr>
              </thead>
            )}
            <tbody>
              {widget.table.rows.map((r) => (
                <tr key={r.label} className="border-t border-white/5">
                  <td className="py-1 truncate">{r.label}</td>
                  <td className="py-1 text-right font-mono tabular-nums">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {widget.footnote && (
          <div className="text-[10px] text-muted-foreground italic">{widget.footnote}</div>
        )}
      </CardContent>
    </Card>
  );
}
