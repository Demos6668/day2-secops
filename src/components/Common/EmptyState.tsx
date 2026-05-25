import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/shared";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title = "No results found",
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-14 px-6 text-center",
        // A deliberate rest, not an error. Gentle gradient, no dashed border.
        "rounded-xl border hairline bg-gradient-to-b from-card/60 to-card/20",
        className,
      )}
    >
      {Icon && <Icon className="h-10 w-10 text-primary/40 mb-3" aria-hidden="true" />}
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-md mb-3 leading-relaxed">{description}</p>
      )}
      {action && (
        <Button variant="link" className="text-primary text-xs" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
