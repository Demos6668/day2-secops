import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/Common/EmptyState";
import { RagBadge } from "@/components/Common/RagBadge";
import { useFeeder } from "@/components/Feeder";
import { CAUSES } from "@/lib/visibility/causes";
import { CAUSE_ICONS } from "@/lib/visibility/cause-icons";
import { CAUSE_WEIGHT_NUMERIC } from "@/lib/rag-tokens";
import { useNotifications } from "@/components/NotificationCenter";
import { useWorkspace } from "@/lib/workspace";
import { formatRelative } from "@/lib/utils";
import type { VisibilityCauseFlag } from "@/types/tool";

const ALL_FLAGS = Object.keys(CAUSES) as VisibilityCauseFlag[];

function isValidFlag(v: string | undefined): v is VisibilityCauseFlag {
  return !!v && ALL_FLAGS.includes(v as VisibilityCauseFlag);
}

export default function CauseDetail() {
  const [, params] = useRoute<{ flag?: string }>("/causes/:flag");
  const flag = params?.flag;
  const { tools } = useFeeder();
  const { frameworks } = useWorkspace();
  const { events } = useNotifications();

  if (!isValidFlag(flag)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Unknown cause" icon={AlertTriangle} />
        <EmptyState
          title="Unknown cause flag"
          description={`"${flag}" is not in the active taxonomy.`}
        />
      </div>
    );
  }

  const meta = CAUSES[flag];
  const Icon = CAUSE_ICONS[flag];
  const flagged = tools.filter((t) => t.causes.includes(flag));
  const relatedEvents = useMemo(
    () => events.filter((e) => e.description?.includes(meta.label)).slice(0, 20),
    [events, meta.label],
  );

  // Light reverse-lookup: any framework control whose anchor tools currently
  // carry this flag is "implicated" by the cause. Useful for auditors.
  const implicatedControls = frameworks.flatMap((fw) =>
    fw.controls
      .filter((c) => c.anchorTools.some((id) => flagged.some((t) => t.id === id)))
      .map((c) => ({ framework: fw, control: c })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={meta.label}
        icon={Icon}
        description={meta.description}
        meta={`${meta.weight} weight · −${CAUSE_WEIGHT_NUMERIC[meta.weight]} pts`}
        breadcrumb={[{ label: "Causes" }, { label: meta.label }]}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              Back
            </Link>
          </Button>
        }
      />

      {/* Currently flagged tools */}
      <Card className="glass-panel">
        <CardContent className="p-4 space-y-3">
          <header className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Currently flagged tools
            </div>
            <Badge variant="outline" className="text-[10px]">
              {flagged.length}
            </Badge>
          </header>
          {flagged.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No tool currently carries this flag.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {flagged.map((t) => (
                <li key={t.id} className="py-2 flex items-center gap-3 text-xs">
                  <RagBadge status={t.status} showLabel={false} />
                  <div className="flex-1 min-w-0">
                    <Link href={`/tools/${t.id}`} className="font-medium hover:text-primary">
                      {t.solution}
                    </Link>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      <Link
                        href={`/oems/${encodeURIComponent(t.oem)}`}
                        className="hover:text-primary"
                      >
                        {t.oem}
                      </Link>{" "}
                      · {t.tower} · {t.severity}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    synced {formatRelative(t.lastSync)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Implicated controls */}
      <Card className="glass-panel">
        <CardContent className="p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Implicated audit controls
          </div>
          {implicatedControls.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No control in the active frameworks is implicated by this flag right now.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {implicatedControls.slice(0, 12).map(({ framework, control }) => (
                <li key={`${framework.id}-${control.id}`} className="py-2 text-xs">
                  <Link
                    href={`/controls/${framework.id}/${control.id}`}
                    className="font-medium hover:text-primary"
                  >
                    <span className="font-mono text-[10px] mr-2 text-muted-foreground">
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

      {/* Recent events */}
      <Card className="glass-panel">
        <CardContent className="p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Recent events mentioning this flag
          </div>
          {relatedEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No recent events. Quiet.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {relatedEvents.map((e) => (
                <li key={e.id} className="py-2 text-xs">
                  <div className="font-medium">{e.title}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {formatRelative(new Date(e.at).toISOString())}
                    {e.description ? ` · ${e.description}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
