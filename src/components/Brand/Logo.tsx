import { cn } from "@/lib/utils";
import { OemMark } from "./OemMark";

interface LogoProps {
  withWordmark?: boolean;
  size?: number;
  className?: string;
}

/**
 * Day2 SecOps brand lockup, co-branded for the Vodafone Idea workspace.
 *
 * Renders the Vi mark (resolved via OemMark's candidate chain — local SVG →
 * logo.dev → monogram fallback) next to the "Day2 SecOps" wordmark. The
 * tagline reads "Security visibility" to keep the platform identity intact
 * while the mark anchors the customer.
 */
export function Logo({ withWordmark = true, size = 32, className }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)} aria-label="Vi · Day2 SecOps">
      <OemMark oem="Vi" size={size} />
      {withWordmark && (
        <div className="flex flex-col leading-none">
          <span className="font-bold text-sm tracking-tight">Day2 SecOps</span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">
            Security visibility
          </span>
        </div>
      )}
    </div>
  );
}
