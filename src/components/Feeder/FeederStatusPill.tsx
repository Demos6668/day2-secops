import { Activity, Pause, Play } from "lucide-react";
import { useFeeder } from "./FeederProvider";
import { Button } from "@/components/ui/button";
import { cn, formatRelative } from "@/lib/utils";

interface FeederStatusPillProps {
  className?: string;
}

export function FeederStatusPill({ className }: FeederStatusPillProps) {
  const { lastTick, running, setRunning } = useFeeder();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px] font-mono",
        running
          ? "border-[#22C55E]/35 bg-[#22C55E]/10 text-[#22C55E]"
          : "border-border bg-muted/30 text-muted-foreground",
        className,
      )}
      aria-label={running ? "Feeder live" : "Feeder paused"}
    >
      <Activity className={cn("h-3 w-3", running && "animate-pulse")} />
      <span>{running ? "LIVE" : "PAUSED"}</span>
      {lastTick && (
        <span className="text-muted-foreground/80">
          · tick {formatRelative(new Date(lastTick).toISOString())}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setRunning(!running)}
        aria-label={running ? "Pause feeder" : "Start feeder"}
        className="h-5 w-5 -mr-1"
      >
        {running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </Button>
    </div>
  );
}
