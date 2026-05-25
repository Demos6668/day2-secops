import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "./store";

interface ActivityPillProps {
  className?: string;
}

/**
 * Bottom-right activity pill. NEVER pops up — sits at low visual weight in the
 * corner and ticks a counter when new events arrive. Click → opens the bell.
 *
 * This is the primary "something happened" surface for non-Critical changes.
 * Toasts only fire for Critical-on-Critical RED, and only when the operator
 * explicitly opted in.
 */
export function ActivityPill({ className }: ActivityPillProps) {
  const { unread, events } = useNotifications();
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (unread === 0) return undefined;
    setBump(true);
    const t = setTimeout(() => setBump(false), 800);
    return () => clearTimeout(t);
  }, [unread, events.length]);

  if (unread === 0) return null;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("abcl-secviz:open-notifications"))}
      aria-label={`${unread} new event${unread === 1 ? "" : "s"} in the inbox`}
      className={cn(
        "fixed bottom-14 right-4 z-30 inline-flex items-center gap-1.5 rounded-full",
        "border border-border bg-card/95 backdrop-blur shadow-md",
        "px-2.5 py-1 text-[11px] font-mono",
        "text-foreground hover:text-primary hover:border-primary/40 transition-colors",
        bump && "scale-105",
        "transition-transform duration-200",
        "print:hidden",
        className,
      )}
    >
      <Activity className="h-3 w-3 text-[#D97706]" aria-hidden="true" />
      <span className="tabular-nums">+{unread} new</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">inbox</span>
    </button>
  );
}
