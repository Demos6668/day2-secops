import { useMemo, useState } from "react";
import { ListChecks, Plus, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AuditChecklistsFileSchema,
  type AuditChecklist as Checklist,
  type ChecklistItem,
} from "@/types/audit-checklists";
import checklistsRaw from "../../workspaces/abcl/audit-checklists.json";

const CHECKLISTS_DATA = AuditChecklistsFileSchema.parse(checklistsRaw);

const STATUS_TONE: Record<ChecklistItem["status"], string> = {
  open: "text-muted-foreground border-muted-foreground/30",
  "in-progress": "text-[#B45309] dark:text-[#F59E0B] border-[#B45309]/40 bg-[#B45309]/10",
  done: "text-[#15803D] dark:text-[#4ADE80] border-[#22C55E]/30 bg-[#22C55E]/10",
};

const STATUS_ICON: Record<ChecklistItem["status"], typeof Circle> = {
  open: Circle,
  "in-progress": AlertCircle,
  done: CheckCircle2,
};

const STATUS_LABEL: Record<ChecklistItem["status"], string> = {
  open: "Status: open",
  "in-progress": "Status: in progress",
  done: "Status: done",
};

const STATUS_ICON_TONE: Record<ChecklistItem["status"], string> = {
  open: "text-muted-foreground",
  "in-progress": "text-[#B45309] dark:text-[#F59E0B]",
  done: "text-[#15803D] dark:text-[#4ADE80]",
};

export default function AuditChecklist() {
  const [lists] = useState<Checklist[]>(CHECKLISTS_DATA.checklists);

  const summary = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const l of lists) {
      total += l.items.length;
      done += l.items.filter((i) => i.status === "done").length;
    }
    return { done, total };
  }, [lists]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit — Custom checklist"
        icon={ListChecks}
        description="Audit punch-lists scoped to the active workspace. Each list anchors to specific framework controls and owners, and tracks to closure."
        breadcrumb={[{ label: "Audit" }, { label: "Custom checklist" }]}
        meta={`${lists.length} lists · ${summary.done}/${summary.total} items closed`}
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
            <Card key={list.id} className="glass-panel">
              <CardContent className="p-4 space-y-3">
                <header className="space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-sm font-semibold">{list.name}</h2>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-mono tabular-nums">
                        {done} / {total} done
                      </Badge>
                      {list.due && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          due {list.due}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {list.description && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {list.description}
                    </p>
                  )}
                  {list.owner && (
                    <div className="text-[10px] font-mono text-muted-foreground">
                      owner · {list.owner}
                    </div>
                  )}
                </header>
                <ul className="divide-y divide-white/5">
                  {list.items.map((it) => {
                    const Icon = STATUS_ICON[it.status];
                    return (
                      <li key={it.id} className="py-2 flex items-start gap-3 text-xs">
                        <Icon
                          className={`h-4 w-4 shrink-0 mt-0.5 ${STATUS_ICON_TONE[it.status]}`}
                          role="img"
                          aria-label={STATUS_LABEL[it.status]}
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
                            {it.control && (
                              <Badge variant="outline" className="text-[9px] font-mono">
                                {it.control}
                              </Badge>
                            )}
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
