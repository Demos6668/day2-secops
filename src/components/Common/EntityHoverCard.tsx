import type { ReactNode } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

interface EntityHoverCardProps {
  /** What the user hovers (typically a link or chip). */
  trigger: ReactNode;
  /** Optional title shown at the top of the popover. */
  title?: ReactNode;
  /** Free-form body. Keep it tight — this is a peek, not a page. */
  children: ReactNode;
  /** Footer (e.g. "click to open"). */
  footer?: ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  openDelay?: number;
  closeDelay?: number;
}

/**
 * Generic "peek" popover used to preview entities (causes, controls, OEMs,
 * tools) without forcing the user to navigate away. The trigger MUST already
 * be the click target; this wrapper only adds hover behaviour around it.
 */
export function EntityHoverCard({
  trigger,
  title,
  children,
  footer,
  className,
  side = "top",
  openDelay = 200,
  closeDelay = 100,
}: EntityHoverCardProps) {
  return (
    <HoverCard openDelay={openDelay} closeDelay={closeDelay}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align="start"
        className={cn("w-72 p-3 space-y-2 text-xs", className)}
      >
        {title && <div className="font-semibold text-foreground">{title}</div>}
        <div className="text-muted-foreground leading-snug">{children}</div>
        {footer && <div className="pt-1.5 border-t border-white/5 text-[10px]">{footer}</div>}
      </HoverCardContent>
    </HoverCard>
  );
}
