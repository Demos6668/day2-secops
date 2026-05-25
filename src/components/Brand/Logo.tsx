import { cn } from "@/lib/utils";

interface LogoProps {
  withWordmark?: boolean;
  size?: number;
  className?: string;
}

/**
 * Day2 SecOps brand lockup. Mark image is shared with the day2.OSINT sister
 * product — both belong to the Day-2 operations product family.
 */
export function Logo({ withWordmark = true, size = 32, className }: LogoProps) {
  const base = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/images/day2-secops-mark.png`;
  return (
    <div className={cn("inline-flex items-center gap-2", className)} aria-label="Day2 SecOps">
      <img
        src={base}
        alt=""
        width={size}
        height={size}
        className="rounded-md shrink-0"
        loading="eager"
        decoding="async"
      />
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
