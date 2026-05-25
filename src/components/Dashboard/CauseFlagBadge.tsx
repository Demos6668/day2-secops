import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { CAUSES } from "@/lib/visibility/causes";
import { CAUSE_ICONS } from "@/lib/visibility/cause-icons";
import { CAUSE_WEIGHT_NUMERIC } from "@/lib/rag-tokens";
import { EntityHoverCard } from "@/components/Common/EntityHoverCard";
import { useFeeder } from "@/components/Feeder";
import type { VisibilityCauseFlag } from "@/types/tool";

interface CauseFlagBadgeProps {
  cause: VisibilityCauseFlag;
  /** Compact mode hides the label, leaving icon + weight only. */
  compact?: boolean;
  /** When true the badge becomes a Link to /causes/:flag. */
  linked?: boolean;
  className?: string;
}

// Audit issue #1 — cause chips were competing with severity pills.
// Now: no bg-tint, no border. Just colored icon + muted-foreground label.
// The icon carries weight; the chip stops fighting the row for attention.
const WEIGHT_TONE: Record<"High" | "Medium" | "Low", string> = {
  High: "text-[#F87171]",
  Medium: "text-[#F59E0B]",
  Low: "text-muted-foreground",
};

export function CauseFlagBadge({
  cause,
  compact = false,
  linked = true,
  className,
}: CauseFlagBadgeProps) {
  const meta = CAUSES[cause];
  const Icon = CAUSE_ICONS[cause];
  const tone = WEIGHT_TONE[meta.weight];
  const { tools } = useFeeder();
  const flaggedTools = tools.filter((t) => t.causes.includes(cause));

  const chip = (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium",
        // Compact mode keeps the colored icon visible without label.
        compact ? tone : "text-muted-foreground",
        linked && "cursor-pointer hover:text-foreground transition-colors",
        className,
      )}
      aria-label={`Cause: ${meta.label} (${meta.weight} weight, penalty ${CAUSE_WEIGHT_NUMERIC[meta.weight]})`}
    >
      <Icon className={cn("h-3 w-3 shrink-0", !compact && tone)} aria-hidden="true" />
      {!compact && <span className="truncate">{meta.label}</span>}
    </span>
  );

  const trigger = linked ? (
    <Link href={`/causes/${cause}`} onClick={(e) => e.stopPropagation()}>
      {chip}
    </Link>
  ) : (
    chip
  );

  return (
    <EntityHoverCard
      trigger={trigger}
      title={
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {meta.label}
        </div>
      }
      footer={
        linked ? <span className="text-primary">Click for full cause page →</span> : undefined
      }
    >
      <div>{meta.description}</div>
      <div className="text-[10px] font-mono mt-1">
        {meta.weight} weight · −{CAUSE_WEIGHT_NUMERIC[meta.weight]} pts
        {meta.forcesRedOnCritical && " · forces red on Critical"}
      </div>
      {flaggedTools.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <div className="text-[10px] font-mono text-muted-foreground mb-1">
            Currently flagged ({flaggedTools.length})
          </div>
          <ul className="space-y-0.5">
            {flaggedTools.slice(0, 3).map((t) => (
              <li key={t.id} className="text-[11px] truncate text-foreground">
                {t.solution} <span className="text-muted-foreground text-[10px]">· {t.oem}</span>
              </li>
            ))}
            {flaggedTools.length > 3 && (
              <li className="text-[10px] text-muted-foreground">+{flaggedTools.length - 3} more</li>
            )}
          </ul>
        </div>
      )}
    </EntityHoverCard>
  );
}
