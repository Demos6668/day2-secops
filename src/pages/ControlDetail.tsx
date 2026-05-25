import { Link, useRoute } from "wouter";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { EmptyState } from "@/components/Common/EmptyState";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { RagBadge } from "@/components/Common/RagBadge";
import { useFeeder } from "@/components/Feeder";
import { useWorkspace } from "@/lib/workspace";
import { findControl, toolsCovering } from "@/lib/graph";
import { rollupControl } from "@/lib/audit/coverage";

export default function ControlDetail() {
  const [, params] = useRoute<{ framework?: string; controlId?: string }>(
    "/controls/:framework/:controlId",
  );
  const fwId = params?.framework;
  const ctrlId = params?.controlId;
  const { frameworks } = useWorkspace();
  const { tools } = useFeeder();

  if (!fwId || !ctrlId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Control" icon={ShieldCheck} />
        <EmptyState title="Bad route" description="Missing framework or control id." />
      </div>
    );
  }

  const hit = findControl(frameworks, fwId, ctrlId);
  if (!hit) {
    return (
      <div className="space-y-6">
        <PageHeader title="Control" icon={ShieldCheck} />
        <EmptyState
          title="Control not found"
          description={`No "${ctrlId}" in framework "${fwId}".`}
        />
      </div>
    );
  }

  const { framework, control } = hit;
  const anchored = toolsCovering(tools, control);
  const roll = rollupControl(control, tools);

  return (
    <div className="space-y-6">
      <PageHeader
        title={control.title}
        icon={ShieldCheck}
        description={`${framework.name} · ${control.id}`}
        meta={`${anchored.length} anchor tool${anchored.length === 1 ? "" : "s"} · roll-up ${roll.overall}`}
        breadcrumb={[
          { label: "Audit", href: "/audit" },
          { label: framework.shortName, href: `/audit/${framework.id}` },
          { label: control.id },
        ]}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/audit/${framework.id}`}>
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              Back to {framework.shortName}
            </Link>
          </Button>
        }
      />

      <Card className="glass-panel">
        <CardContent className="p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Anchor tools
          </div>
          {anchored.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No tool currently anchors this control — gap.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {anchored.map((t) => (
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
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {((t.observed / Math.max(1, t.denominator)) * 100).toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardContent className="p-4 space-y-2 text-xs">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Evidence locker
          </div>
          <p className="text-muted-foreground">
            Per-control evidence URLs, last-reviewed date, and attestation owner.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
