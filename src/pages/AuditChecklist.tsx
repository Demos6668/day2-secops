import { useState } from "react";
import { ListChecks, Plus, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  status: "open" | "in-progress" | "done";
  due?: string;
  owner?: string;
}

const DEMO_CHECKLISTS: { name: string; items: ChecklistItem[] }[] = [
  {
    name: "Quarterly access review (Q2 2026)",
    items: [
      {
        id: "qa-1",
        title: "PAM vault — revoke users not in HRMS active set",
        status: "done",
        owner: "ops",
      },
      {
        id: "qa-2",
        title: "MFA — re-enroll users who skipped FIDO2 rollout",
        status: "in-progress",
        owner: "iam",
      },
      {
        id: "qa-3",
        title: "Forescout NAC — clean stale device CMDB rows",
        status: "open",
        owner: "net-ops",
      },
      {
        id: "qa-4",
        title: "SFTP — audit external partner account list",
        status: "open",
        owner: "ops",
      },
    ],
  },
  {
    name: "RBI audit prep — May 2026",
    items: [
      {
        id: "rbi-1",
        title: "Pull all RBI-CSF anchor-tool evidence URLs",
        status: "done",
        owner: "audit",
      },
      {
        id: "rbi-2",
        title: "Confirm 100% disk encryption on laptops",
        status: "in-progress",
        owner: "endpoint",
      },
      {
        id: "rbi-3",
        title: "DLP outbound-mail policy proof of effectiveness",
        status: "open",
        owner: "data",
      },
    ],
  },
];

const STATUS_TONE: Record<ChecklistItem["status"], string> = {
  open: "text-muted-foreground border-muted-foreground/30",
  "in-progress": "text-[#F59E0B] border-[#B45309]/40 bg-[#B45309]/10",
  done: "text-[#4ADE80] border-[#22C55E]/30 bg-[#22C55E]/10",
};

export default function AuditChecklist() {
  const [lists] = useState(DEMO_CHECKLISTS);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit — Custom checklist"
        icon={ListChecks}
        description="Ad-hoc audit punch-lists. Define a list, assign owners + due dates, track to closure. Independent of the framework matrices."
        breadcrumb={[{ label: "Audit" }, { label: "Custom checklist" }]}
        meta={`${lists.length} lists`}
        actions={
          <Button size="sm" disabled>
            <Plus className="h-3 w-3 mr-1.5" />
            New checklist
          </Button>
        }
      />

      <div className="space-y-4">
        {lists.map((list) => {
          const done = list.items.filter((i) => i.status === "done").length;
          const total = list.items.length;
          return (
            <Card key={list.name} className="glass-panel">
              <CardContent className="p-4 space-y-3">
                <header className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm font-semibold">{list.name}</h2>
                  <Badge variant="outline" className="text-[10px] font-mono tabular-nums">
                    {done} / {total} done
                  </Badge>
                </header>
                <ul className="divide-y divide-white/5">
                  {list.items.map((it) => {
                    const Icon =
                      it.status === "done"
                        ? CheckCircle2
                        : it.status === "in-progress"
                          ? AlertCircle
                          : Circle;
                    const statusLabel =
                      it.status === "done"
                        ? "Status: done"
                        : it.status === "in-progress"
                          ? "Status: in progress"
                          : "Status: open";
                    return (
                      <li key={it.id} className="py-2 flex items-start gap-3 text-xs">
                        <Icon
                          className={
                            it.status === "done"
                              ? "h-4 w-4 text-[#4ADE80] shrink-0 mt-0.5"
                              : it.status === "in-progress"
                                ? "h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5"
                                : "h-4 w-4 text-muted-foreground shrink-0 mt-0.5"
                          }
                          role="img"
                          aria-label={statusLabel}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{it.title}</div>
                          {it.description && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {it.description}
                            </div>
                          )}
                          <div className="text-[10px] font-mono text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                            {it.owner && <span>owner · {it.owner}</span>}
                            {it.due && <span>due · {it.due}</span>}
                          </div>
                        </div>
                        <span
                          className={
                            "inline-flex items-center rounded-full border px-2 py-px text-[10px] font-mono uppercase tracking-widest " +
                            STATUS_TONE[it.status]
                          }
                        >
                          {it.status}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
