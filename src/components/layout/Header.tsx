import { useTheme } from "next-themes";
import { Search, Moon, Sun, Command, Printer, Box, Rows3, Rows4 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DemoWatermark } from "@/components/Common/DemoWatermark";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useWireframeMode } from "@/hooks/useWireframeMode";
import { useDensity } from "@/hooks/useDensity";

interface HeaderProps {
  workspaceName: string;
}

export function Header({ workspaceName }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { enabled: wireframe, toggle: toggleWireframe } = useWireframeMode();
  const { density, toggle: toggleDensity } = useDensity();

  return (
    <header className="h-14 border-b hairline surface-card flex items-center px-4 sm:px-6 gap-3 shrink-0 relative">
      {/* Day2 SecOps signature stripe along the top edge */}
      <div className="absolute inset-x-0 top-0 brand-stripe" aria-hidden="true" />
      <div className="flex items-center gap-2 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="brand-dot cursor-default" role="img" aria-label="Day2 SecOps live" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Day2 SecOps — security visibility platform
          </TooltipContent>
        </Tooltip>
        <span className="text-sm font-semibold truncate">{workspaceName}</span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden sm:inline">
          workspace
        </span>
      </div>

      <div className="flex-1" />

      <button
        type="button"
        className="hidden md:flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-background/40 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        onClick={() => {
          // CommandPalette wires this in Phase 4; firing the event keeps the seam.
          window.dispatchEvent(new CustomEvent("abcl-secviz:open-command"));
        }}
        aria-label="Open command palette"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search tools, controls, causes…</span>
        <Kbd className="ml-4">
          <Command className="h-3 w-3" />K
        </Kbd>
      </button>

      <DemoWatermark className="hidden xl:inline-flex" />

      <NotificationCenter />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.print()}
        aria-label="Print / export view"
        className="h-8 w-8 hidden md:inline-flex"
        title="Print or save as PDF"
      >
        <Printer className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDensity}
        aria-label={`Density: ${density}. Click to toggle.`}
        title={`Density: ${density}`}
        className="h-8 w-8 hidden md:inline-flex"
      >
        {density === "comfortable" ? <Rows3 className="h-4 w-4" /> : <Rows4 className="h-4 w-4" />}
      </Button>

      <Button
        variant={wireframe ? "default" : "ghost"}
        size="icon"
        onClick={toggleWireframe}
        aria-pressed={wireframe}
        aria-label={`${wireframe ? "Disable" : "Enable"} wireframe mode`}
        className="h-8 w-8 hidden md:inline-flex"
        title="Wireframe mode (greyscale, dashed borders)"
      >
        <Box className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
        className="h-8 w-8"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  );
}
