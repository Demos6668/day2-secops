import { useMemo } from "react";
import { useSearch } from "wouter";
import { Share2 } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Badge } from "@/components/ui/badge";
import { RelationshipGraph } from "@/components/Feasibility/RelationshipGraph";
import { useWorkspace } from "@/lib/workspace";
import { useFeeder } from "@/components/Feeder";
import { buildEdges } from "@/lib/feasibility/relations";

export default function Feasibility() {
  const { categoryRelations } = useWorkspace();
  const { tools } = useFeeder();
  const searchString = useSearch();
  const focusedId = useMemo(
    () => new URLSearchParams(searchString).get("focus") ?? undefined,
    [searchString],
  );

  const edges = useMemo(() => buildEdges(tools, categoryRelations), [tools, categoryRelations]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feasibility &amp; Linking"
        icon={Share2}
        description="Related tools by category. Same-category edges are solid; adjacent control families dashed."
        meta={`${tools.length} nodes · ${edges.length} edges`}
      />

      <RelationshipGraph tools={tools} relations={categoryRelations} focusedId={focusedId} />

      <Card className="glass-panel">
        <CardContent className="p-4 space-y-2 text-xs">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Edge legend
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <li className="flex items-center gap-2">
              <span className="inline-block w-6 h-0.5 bg-primary" />
              <span className="text-muted-foreground">
                Same category — eg. Imperva ↔ AppTrana (both WAF/WAAP)
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className="inline-block w-6 h-0.5"
                style={{ borderTop: "2px dashed hsl(var(--muted-foreground))" }}
              />
              <span className="text-muted-foreground">
                Adjacent control family — eg. EDR ↔ HIPS, MFA ↔ PAM
              </span>
            </li>
          </ul>
          <div className="pt-3 mt-2 border-t border-white/5 text-[10px] font-mono text-muted-foreground space-y-0.5">
            {categoryRelations.map((r) => (
              <div key={`${r.from}-${r.to}-${r.kind}`}>
                <Badge variant="outline" className="text-[10px] mr-2">
                  {r.kind}
                </Badge>
                {r.from} ↔ {r.to} — {r.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
