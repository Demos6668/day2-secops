import { Settings as SettingsIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Switch } from "@/components/ui/switch";
import { useWorkspace } from "@/lib/workspace";
import { useFeeder } from "@/components/Feeder";
import { useDensity } from "@/hooks/useDensity";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { config } = useWorkspace();
  const { popToasts, setPopToasts, liveMode, setLiveMode } = useFeeder();
  const { density, setDensity } = useDensity();

  const wireframe =
    typeof document !== "undefined" && document.body.classList.contains("wireframe-mode");

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" icon={SettingsIcon} />
      <Card className="glass-panel">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Workspace</div>
              <div className="text-xs text-muted-foreground">{config.name}</div>
            </div>
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              {config.id}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Dark mode</div>
              <div className="text-xs text-muted-foreground">
                Toggle between dark and light themes.
              </div>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
              aria-label="Toggle dark mode"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <div className="text-sm font-medium">Pop toast notifications</div>
              <div className="text-xs text-muted-foreground">
                Off by default. When on, only <strong>Critical-on-Critical RED</strong> events pop a
                toast (max 2 per minute, deduped over 5 minutes, paused while the inbox is open or
                the tab is hidden). Everything else stays in the inbox.
              </div>
            </div>
            <Switch
              checked={popToasts}
              onCheckedChange={setPopToasts}
              aria-label="Toggle pop toast notifications"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <div className="text-sm font-medium">Density</div>
              <div className="text-xs text-muted-foreground">
                <strong>Comfortable</strong> — more whitespace, easier on long shifts (default).{" "}
                <strong>Compact</strong> — more rows per screen for triage-heavy moments.
              </div>
            </div>
            <Switch
              checked={density === "compact"}
              onCheckedChange={(v) => setDensity(v ? "compact" : "comfortable")}
              aria-label="Toggle compact density"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <div className="text-sm font-medium">Live mode</div>
              <div className="text-xs text-muted-foreground">
                Off = MockSource (default). On = read from the Day2 SecOps API via WebSocket.
                Requires the api-server (port 8082) to be reachable.
              </div>
            </div>
            <Switch
              checked={liveMode}
              onCheckedChange={setLiveMode}
              aria-label="Toggle live data mode"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Wireframe mode</div>
              <div className="text-xs text-muted-foreground">
                Greyscale + dashed borders for stakeholder reviews.
              </div>
            </div>
            <Switch
              defaultChecked={wireframe}
              onCheckedChange={(v) => document.body.classList.toggle("wireframe-mode", v)}
              aria-label="Toggle wireframe mode"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
