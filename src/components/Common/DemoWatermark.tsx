import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoWatermarkProps {
  text?: string;
  className?: string;
}

/**
 * Persistent demo watermark. Required on every page (brief §6).
 *
 * Audit honorable-mention: previously shared the same alpha recipe as the
 * severity pills (#D97706 fill + #D97706 text), which made it look like
 * "another chip." Now uses its own visual register — outlined Outfit caps
 * with a transparent fill — to read as "environment notice," not "status."
 */
export function DemoWatermark({
  text = "DEMO DATA — NOT PRODUCTION",
  className,
}: DemoWatermarkProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[#D97706]/50 bg-transparent px-2.5 py-0.5",
        "text-[10px] font-sans font-bold tracking-[0.18em] uppercase text-[#D97706]",
        className,
      )}
      aria-label="Environment notice"
    >
      <ShieldAlert className="h-3 w-3" aria-hidden="true" />
      {text}
    </div>
  );
}
