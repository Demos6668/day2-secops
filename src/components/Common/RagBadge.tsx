import { cn } from "@/lib/utils";
import { getRagToken } from "@/lib/rag-tokens";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RagStatus } from "@/types/tool";

interface RagBadgeProps {
  status: RagStatus;
  /** Show the icon next to the label (default true). */
  showIcon?: boolean;
  /** Show the text label (default true). The brief requires icon+text, never color-only. */
  showLabel?: boolean;
  /** Wrap in a hover tooltip explaining the status (default true). */
  tooltip?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const TOOLTIP_TEXT: Record<RagStatus, string> = {
  green: "RAG green — coverage above 90% with no high-weight causes.",
  amber: "RAG amber — coverage 70–90% or one medium-weight cause active.",
  red: "RAG red — coverage below 70%, or a Critical tool tipped by a high-weight cause.",
};

export function RagBadge({
  status,
  showIcon = true,
  showLabel = true,
  tooltip = true,
  className,
  children,
}: RagBadgeProps) {
  const token = getRagToken(status);
  const Icon = token.icon;

  const chip = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase",
        token.bg,
        token.fg,
        token.border,
        className,
      )}
      role="status"
      aria-label={token.aria}
    >
      {showIcon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {showLabel && (children ?? token.label.toUpperCase())}
    </span>
  );

  if (!tooltip) return chip;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-xs">
        {TOOLTIP_TEXT[status]}
      </TooltipContent>
    </Tooltip>
  );
}
