import { useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "./store";
import { cn, formatRelative } from "@/lib/utils";
import type { NotificationEvent } from "@/lib/notifications/budget";

const KIND_ICON: Record<NotificationEvent["kind"], LucideIcon> = {
  rag_flip: AlertOctagon,
  cause_added: AlertTriangle,
  cause_cleared: ArrowDownRight,
  recovered: ArrowUpRight,
  info: Info,
};

const KIND_TONE: Record<NotificationEvent["kind"], string> = {
  rag_flip: "text-[#EF4444]",
  cause_added: "text-[#D97706]",
  cause_cleared: "text-muted-foreground",
  recovered: "text-[#22C55E]",
  info: "text-primary",
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { events, unread, markRead, clear } = useNotifications();

  const ordered = useMemo(() => [...events].sort((a, b) => b.at - a.at), [events]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setOpen(true);
          if (unread > 0) markRead();
        }}
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications (none unread)"}
        className="relative h-8 w-8"
      >
        <Bell className={cn("h-4 w-4", unread > 0 && "animate-[wiggle_1.2s_ease-in-out_1]")} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-[#EF4444] text-[8px] font-mono font-bold text-white flex items-center justify-center px-0.5 leading-none ring-1 ring-card">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-hidden flex flex-col">
          <SheetHeader className="px-5 py-4 border-b border-white/5 flex-row items-center justify-between space-y-0">
            <div>
              <SheetTitle className="text-base">Notifications</SheetTitle>
              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                {events.length} event{events.length === 1 ? "" : "s"} · {unread} unread
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Mark all read"
                onClick={markRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Clear all"
                onClick={clear}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {ordered.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-muted-foreground">
                Nothing to report. The dashboard is talking softly.
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {ordered.map((e) => {
                  const Icon = KIND_ICON[e.kind];
                  return (
                    <li
                      key={e.id}
                      className={cn(
                        "px-5 py-3 flex items-start gap-3",
                        !e.read && "bg-primary/[0.04]",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", KIND_TONE[e.kind])} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium truncate">{e.title}</span>
                          <Badge variant="outline" className="text-[9px] uppercase tracking-widest">
                            {e.severity}
                          </Badge>
                          {!e.toastFired && (
                            <Badge variant="outline" className="text-[9px] text-muted-foreground">
                              silent
                            </Badge>
                          )}
                        </div>
                        {e.description && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {e.description}
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          {formatRelative(new Date(e.at).toISOString())}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
