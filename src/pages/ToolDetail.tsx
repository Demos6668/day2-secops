import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { Boxes, ArrowLeft, ExternalLink, GitCompareArrows } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { EmptyState } from "@/components/Common/EmptyState";
import { RagBadge } from "@/components/Common/RagBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/shared";
import { Badge } from "@/components/ui/badge";
import { OemMark } from "@/components/Brand";
import { ScoreBreakdown } from "@/components/Dashboard/ScoreBreakdown";
import { ToolDashboard } from "@/components/ToolDashboard";
import { useWorkspace } from "@/lib/workspace";
import { useFeeder } from "@/components/Feeder";
import { recipeForTool } from "@/lib/tool-dashboards/recipes";
import { controlsAnchoredBy, relatedToolsByCategory } from "@/lib/graph";
import { useNotifications } from "@/components/NotificationCenter";
import { formatRelative } from "@/lib/utils";
import { TOWER_FRESHNESS_KEY } from "@/types/tool";

export default function ToolDetail() {
  const [, params] = useRoute<{ id?: string }>("/tools/:id");
  const { config, frameworks, categoryRelations } = useWorkspace();
  const { tools } = useFeeder();
  const { events } = useNotifications();
  const [tab, setTab] = useState<"native" | "score" | "related">("native");

  const tool = tools.find((t) => t.id === params?.id);

  const recipe = useMemo(() => (tool ? recipeForTool(tool) : null), [tool]);
  const anchors = useMemo(
    () => (tool ? controlsAnchoredBy(frameworks, tool.id) : []),
    [frameworks, tool],
  );
  const related = useMemo(
    () => (tool ? relatedToolsByCategory(tools, categoryRelations, tool.id) : []),
    [tools, categoryRelations, tool],
  );
  const recentEvents = useMemo(
    () => (tool ? events.filter((e) => e.toolId === tool.id).slice(0, 10) : []),
    [events, tool],
  );

  if (!tool || !recipe) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tool not found" icon={Boxes} />
        <EmptyState
          title="Unknown tool"
          description={`No tool with id "${params?.id}" in this workspace.`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tool.solution}
        icon={Boxes}
        description={`${tool.oem} · ${tool.tower} · ${tool.severity} · ${tool.hosting}`}
        breadcrumb={[{ label: "Tools", href: "/tools" }, { label: tool.solution }]}
        actions={
          <Button asChild size="sm" variant="ghost">
            <Link href="/tools">
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              All tools
            </Link>
          </Button>
        }
      />

      {/* Hero strip: brand mark + visibility + RAG */}
      <Card className="glass-panel">
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <OemMark oem={tool.oem} size={56} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/oems/${encodeURIComponent(tool.oem)}`}
                className="text-sm font-semibold hover:text-primary"
              >
                {tool.oem}
              </Link>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {tool.severity}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {tool.tower}
              </Badge>
              <RagBadge status={tool.status} />
            </div>
            <div className="text-[11px] font-mono text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
              <span>
                {tool.observed.toLocaleString()} / {tool.denominator.toLocaleString()}{" "}
                {tool.denominatorUnit ?? "observed"}
              </span>
              <span className="text-border">·</span>
              <span>synced {formatRelative(tool.lastSync)}</span>
              <span className="text-border">·</span>
              <span>score {tool.score.toFixed(1)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Local tabs (lightweight; not a full router tab) */}
      <div className="flex items-center gap-1 border-b border-white/5">
        <TabButton active={tab === "native"} onClick={() => setTab("native")}>
          {tool.oem} view
        </TabButton>
        <TabButton active={tab === "score"} onClick={() => setTab("score")}>
          Score breakdown
        </TabButton>
        <TabButton active={tab === "related"} onClick={() => setTab("related")}>
          Connected ({anchors.length + related.length})
        </TabButton>
      </div>

      {tab === "native" && <ToolDashboard oem={tool.oem} recipe={recipe} />}

      {tab === "score" && (
        <Card className="glass-panel">
          <CardContent className="p-5">
            <ScoreBreakdown
              tool={tool}
              freshnessSloHours={config.freshnessSloHours[TOWER_FRESHNESS_KEY[tool.tower]]}
            />
          </CardContent>
        </Card>
      )}

      {tab === "related" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass-panel">
            <CardContent className="p-4 space-y-2">
              <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                Controls anchored by this tool
              </div>
              {anchors.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  This tool is not currently anchored to any audit control.
                </p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {anchors.map(({ framework, control }) => (
                    <li key={`${framework.id}-${control.id}`} className="py-1.5 text-xs">
                      <Link
                        href={`/controls/${framework.id}/${control.id}`}
                        className="hover:text-primary"
                      >
                        <span className="font-mono text-[10px] text-muted-foreground mr-2">
                          {framework.shortName} · {control.id}
                        </span>
                        {control.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardContent className="p-4 space-y-2">
              <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                Related tools by category
              </div>
              {related.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No siblings or adjacent-category peers in this workspace.
                </p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {related.map(({ tool: rel, via }) => (
                    <li key={rel.id} className="py-1.5 flex items-center gap-2 text-xs">
                      <RagBadge status={rel.status} showLabel={false} />
                      <div className="flex-1 min-w-0">
                        <Link href={`/tools/${rel.id}`} className="font-medium hover:text-primary">
                          {rel.solution}
                        </Link>
                        <div className="text-[10px] font-mono text-muted-foreground">{via}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel md:col-span-2">
            <CardContent className="p-4 space-y-2">
              <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground flex items-center justify-between">
                <span>Recent activity for this tool</span>
                <Link
                  href="/change"
                  className="inline-flex items-center text-[10px] hover:text-primary"
                >
                  <GitCompareArrows className="h-3 w-3 mr-1" />
                  See snapshots
                </Link>
              </div>
              {recentEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Nothing in the activity log for this tool yet.
                </p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {recentEvents.map((e) => (
                    <li key={e.id} className="py-1.5 text-xs">
                      <div className="font-medium">{e.title}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {formatRelative(new Date(e.at).toISOString())}
                        {e.description ? ` · ${e.description}` : ""}
                        {(e.count ?? 1) > 1 ? ` · ×${e.count}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel md:col-span-2">
            <CardContent className="p-4 text-xs text-muted-foreground flex items-center justify-between">
              <span>
                <ExternalLink className="inline h-3 w-3 mr-1" />
                Native console link
              </span>
              <Button size="sm" variant="outline" disabled>
                Open in {tool.oem}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-1.5 text-xs font-medium border-b-2 transition-colors " +
        (active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground")
      }
      aria-current={active ? "page" : undefined}
    >
      {children}
    </button>
  );
}
