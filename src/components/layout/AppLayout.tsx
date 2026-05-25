import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CommandPalette } from "@/components/CommandPalette";
import { ActivityPill } from "@/components/NotificationCenter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWorkspace } from "@/lib/workspace";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useDensity } from "@/hooks/useDensity";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const workspace = useWorkspace();
  useGlobalShortcuts();
  useDensity(); // applies data-density on <body>, react to localStorage

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={400}>
      <div className="min-h-screen bg-background text-foreground flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          workspaceName={workspace.config.shortName}
        />

        <div
          className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-200 ${
            sidebarCollapsed ? "lg:ml-16" : "lg:ml-60"
          }`}
        >
          <Header workspaceName={workspace.config.name} />
          <main id="main" className="flex-1 overflow-y-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto w-full">
              {children}
            </div>
          </main>
          <Footer watermark={workspace.config.watermark} />
        </div>
        <CommandPalette />
        <ActivityPill />
      </div>
    </TooltipProvider>
  );
}
