import { Plug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/shared";
import { cn } from "@/lib/utils";

interface SiemPillarProps {
  onConnect?: () => void;
  className?: string;
}

/**
 * Greyed-out "SIEM — Coming Soon" placeholder pillar. The Connect button
 * dispatches a window event so other parts of the app (or a real Connect
 * modal in Phase 3+) can hook in without coupling.
 */
export function SiemPillar({ onConnect, className }: SiemPillarProps) {
  const handleConnect = () => {
    if (onConnect) onConnect();
    else
      window.dispatchEvent(
        new CustomEvent("abcl-secviz:connect-siem", { detail: { source: "pillar" } }),
      );
  };

  return (
    <Card className={cn("glass-panel opacity-80", className)}>
      <CardContent className="p-4 space-y-3">
        <header className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-muted/30 border border-border flex items-center justify-center">
              <Plug className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                SIEM
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                ingestion not wired yet
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            Coming Soon
          </Badge>
        </header>

        <div className="py-8 text-center space-y-3 border border-dashed border-border rounded-lg">
          <Plug className="h-6 w-6 mx-auto text-muted-foreground" aria-hidden="true" />
          <p className="text-xs text-muted-foreground max-w-[14rem] mx-auto">
            Connect a SIEM source to surface log-coverage gaps alongside the other towers.
          </p>
          <Button size="sm" variant="outline" onClick={handleConnect} aria-label="Connect SIEM">
            Connect SIEM →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
