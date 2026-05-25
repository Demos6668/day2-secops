import { Info } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/shared";
import { CAUSES, CAUSE_ORDER } from "@/lib/visibility/causes";
import { CAUSE_ICONS } from "@/lib/visibility/cause-icons";
import { CAUSE_WEIGHT_NUMERIC } from "@/lib/rag-tokens";
import { cn } from "@/lib/utils";

interface CauseLegendProps {
  className?: string;
}

const WEIGHT_TONE = {
  High: "text-[#F87171]",
  Medium: "text-[#F59E0B]",
  Low: "text-muted-foreground",
} as const;

/**
 * Anchored legend explaining every cause icon used on tiles + scoring rows.
 * Lives at the foot of the Dashboard so the icons stop being mystery glyphs.
 */
export function CauseLegend({ className }: CauseLegendProps) {
  return (
    <Card className={cn("glass-panel", className)}>
      <CardContent className="p-4 space-y-3">
        <header className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-semibold">Issue icons — legend</h3>
        </header>
        <p className="text-[11px] text-muted-foreground -mt-1">
          Each icon names a specific reason a tool is losing visibility. Higher-weight causes
          subtract more from the security score and can force a Critical tool to RAG red.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          {CAUSE_ORDER.map((c) => {
            const meta = CAUSES[c];
            const Icon = CAUSE_ICONS[c];
            const tone = WEIGHT_TONE[meta.weight];
            return (
              <li key={c}>
                <Link
                  href={`/causes/${c}`}
                  className="block rounded border hairline bg-card/60 px-2.5 py-2 hover:bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", tone)} aria-hidden="true" />
                    <span className="text-xs font-medium">{meta.label}</span>
                    <span className={cn("ml-auto text-[10px] font-mono tabular-nums", tone)}>
                      −{CAUSE_WEIGHT_NUMERIC[meta.weight]}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    {meta.description}
                  </p>
                  <div className="mt-1 text-[10px] font-mono text-muted-foreground">
                    {meta.weight} weight
                    {meta.forcesRedOnCritical && " · forces RED on Critical"}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
