import { Fragment } from "react";
import { Link } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

/**
 * Lightweight breadcrumb. The last item is always rendered as the current
 * location (no link). Use `<Crumb>` items with an optional href to make any
 * level clickable.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground",
        className,
      )}
    >
      <Link
        href="/"
        className="inline-flex items-center hover:text-foreground transition-colors"
        aria-label="Dashboard"
      >
        <Home className="h-3 w-3" />
      </Link>
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${c.label}-${i}`}>
            <ChevronRight className="h-3 w-3 opacity-50" aria-hidden="true" />
            {isLast || !c.href ? (
              <span
                className={cn(isLast ? "text-foreground" : "")}
                aria-current={isLast ? "page" : undefined}
              >
                {c.label}
              </span>
            ) : (
              <Link href={c.href} className="hover:text-foreground transition-colors">
                {c.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
