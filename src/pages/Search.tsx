import { Search as SearchIcon, Command } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Kbd } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";

const SAMPLE_QUERIES: { q: string; reason: string }[] = [
  { q: "red tools", reason: "All tools currently in RAG red status" },
  { q: "endpoint coverage", reason: "Anything in the Endpoint tower" },
  { q: "CyberArk", reason: "MFA + PAM tiles" },
  { q: "agent_silent", reason: "All tools currently flagged with no heartbeat" },
  { q: "ISO 27001 A.5.9", reason: "Asset inventory control + every tool that anchors it" },
];

export default function Search() {
  const openPalette = () => window.dispatchEvent(new CustomEvent("abcl-secviz:open-command"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search"
        icon={SearchIcon}
        description="Global Cmd-K palette indexes tools, OEMs, cause flags, controls, and navigation."
      />
      <Card className="glass-panel">
        <CardContent className="p-6 space-y-4 text-center">
          <Kbd className="text-base">
            <Command className="h-4 w-4 mr-1" />K
          </Kbd>
          <p className="text-sm text-muted-foreground">
            Press <strong>Ctrl/Cmd + K</strong> anywhere in the app to open the palette.
          </p>
          <Button onClick={openPalette} size="sm">
            Open command palette
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardContent className="p-4">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-3">
            Sample queries
          </div>
          <ul className="space-y-2">
            {SAMPLE_QUERIES.map((s) => (
              <li
                key={s.q}
                className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
              >
                <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-background/60 border border-border">
                  {s.q}
                </code>
                <span className="text-xs text-muted-foreground text-right max-w-md">
                  {s.reason}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
