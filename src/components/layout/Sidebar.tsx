import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShieldCheck,
  ShieldAlert,
  GitCompareArrows,
  Boxes,
  Share2,
  Search,
  Settings,
  Menu,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  X,
  Lock,
  Building2,
  ArrowRightLeft,
  Archive,
  Radar,
  Globe2,
  BookCheck,
  ListChecks,
  FileText,
  ScrollText,
  Gavel,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Brand";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavLeaf {
  kind: "leaf";
  name: string;
  href: string;
  icon: LucideIcon;
}
interface NavGroup {
  kind: "group";
  name: string;
  icon: LucideIcon;
  /** Optional self-href — clicking the group label navigates here. */
  href?: string;
  children: NavLeaf[];
}
type NavItem = NavLeaf | NavGroup;

const MAIN_NAV: NavItem[] = [
  {
    kind: "group",
    name: "Tool Landscape",
    icon: LayoutDashboard,
    href: "/",
    children: [
      { kind: "leaf", name: "by Security Tower", href: "/", icon: ShieldCheck },
      { kind: "leaf", name: "by OEM", href: "/oems-overview", icon: Building2 },
    ],
  },
  {
    kind: "group",
    name: "Config Mgmt",
    icon: GitCompareArrows,
    href: "/config/changes",
    children: [
      { kind: "leaf", name: "Config changes", href: "/config/changes", icon: ArrowRightLeft },
      { kind: "leaf", name: "Config backups", href: "/config/backups", icon: Archive },
    ],
  },
  {
    kind: "group",
    name: "Vuln Mgmt",
    icon: ShieldAlert,
    href: "/vuln/insint",
    children: [
      { kind: "leaf", name: "INSINT", href: "/vuln/insint", icon: Radar },
      { kind: "leaf", name: "OSINT", href: "/vuln/osint", icon: Globe2 },
    ],
  },
  {
    kind: "group",
    name: "Audit",
    icon: ShieldCheck,
    href: "/audit/by-framework",
    children: [
      { kind: "leaf", name: "by Framework", href: "/audit/by-framework", icon: BookCheck },
      { kind: "leaf", name: "Custom checklist", href: "/audit/checklist", icon: ListChecks },
      { kind: "leaf", name: "Documentation", href: "/audit/docs", icon: FileText },
    ],
  },
  {
    kind: "group",
    name: "SOPs",
    icon: ScrollText,
    href: "/sops",
    children: [{ kind: "leaf", name: "Policies", href: "/sops/policies", icon: Gavel }],
  },
];

const UTILITY_NAV: NavLeaf[] = [
  { kind: "leaf", name: "Tool Inventory", href: "/tools", icon: Boxes },
  { kind: "leaf", name: "Feasibility", href: "/feasibility", icon: Share2 },
  { kind: "leaf", name: "Search", href: "/search", icon: Search },
];

const SETTINGS_NAV: NavLeaf[] = [
  { kind: "leaf", name: "Admin", href: "/admin", icon: Lock },
  { kind: "leaf", name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  workspaceName: string;
}

function isPathActive(location: string, target: string): boolean {
  if (target === "/") return location === "/";
  return location === target || location.startsWith(target + "/");
}

function groupHasActive(location: string, group: NavGroup): boolean {
  return group.children.some((c) => isPathActive(location, c.href));
}

export function Sidebar({ collapsed = false, onCollapsedChange, workspaceName }: SidebarProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Default-open: the group that contains the active route.
  const initiallyOpen = useMemo<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const item of MAIN_NAV) {
      if (item.kind === "group") {
        map[item.name] = groupHasActive(location, item);
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initiallyOpen);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Open the group containing the current route on every navigation.
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const item of MAIN_NAV) {
        if (item.kind === "group" && groupHasActive(location, item)) {
          next[item.name] = true;
        }
      }
      return next;
    });
  }, [location]);

  const toggleGroup = (name: string) => setOpenGroups((p) => ({ ...p, [name]: !p[name] }));

  void workspaceName; // currently unused — reserved for future per-workspace nav

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center justify-between px-4 border-b hairline-b">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center overflow-hidden whitespace-nowrap"
            >
              <Logo size={28} />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => {
            if (window.innerWidth < 1024) setMobileOpen(false);
            else onCollapsedChange?.(!collapsed);
          }}
          className="p-1.5 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {mobileOpen ? (
            <X className="h-4 w-4 lg:hidden" />
          ) : collapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 space-y-4">
        <Section label="Modules" collapsed={collapsed}>
          {MAIN_NAV.map((item) => (
            <RenderItem
              key={item.name}
              item={item}
              collapsed={collapsed}
              location={location}
              isOpen={item.kind === "group" ? !!openGroups[item.name] : false}
              onToggle={() => item.kind === "group" && toggleGroup(item.name)}
            />
          ))}
        </Section>

        <Section label="Tools" collapsed={collapsed}>
          {UTILITY_NAV.map((item) => (
            <RenderItem
              key={item.href}
              item={item}
              collapsed={collapsed}
              location={location}
              isOpen={false}
              onToggle={() => undefined}
            />
          ))}
        </Section>

        <Section label="Settings" collapsed={collapsed}>
          {SETTINGS_NAV.map((item) => (
            <RenderItem
              key={item.href}
              item={item}
              collapsed={collapsed}
              location={location}
              isOpen={false}
              onToggle={() => undefined}
            />
          ))}
        </Section>
      </nav>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-card border border-border text-foreground"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r hairline surface-card",
          "transition-[width] duration-200",
          collapsed ? "w-16" : "w-60",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        aria-label="Primary"
      >
        <div className="brand-stripe shrink-0" aria-hidden="true" />
        {sidebarContent}
      </aside>
    </>
  );
}

function Section({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      {!collapsed && (
        <div className="px-4 mb-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
      )}
      <ul className="space-y-0.5 px-2">{children}</ul>
    </div>
  );
}

function RenderItem({
  item,
  collapsed,
  location,
  isOpen,
  onToggle,
}: {
  item: NavItem;
  collapsed: boolean;
  location: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (item.kind === "leaf") {
    return (
      <NavLeafRow leaf={item} collapsed={collapsed} active={isPathActive(location, item.href)} />
    );
  }

  const groupActive = groupHasActive(location, item);

  if (collapsed) {
    // In collapsed mode, group label becomes a single icon link to its self-href.
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.href ?? item.children[0].href}
              className={cn(
                "flex items-center justify-center px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/5",
                groupActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={groupActive ? "page" : undefined}
              aria-label={item.name}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.name}
          </TooltipContent>
        </Tooltip>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
          "hover:bg-white/5",
          groupActive
            ? "text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-expanded={isOpen}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">{item.name}</span>
        {isOpen ? (
          <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3 w-3 opacity-60" aria-hidden="true" />
        )}
      </button>
      {isOpen && (
        <ul className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l hairline pl-2">
          {item.children.map((c) => (
            <NavLeafRow
              key={c.href}
              leaf={c}
              collapsed={false}
              active={isPathActive(location, c.href)}
              compact
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function NavLeafRow({
  leaf,
  collapsed,
  active,
  compact = false,
}: {
  leaf: NavLeaf;
  collapsed: boolean;
  active: boolean;
  compact?: boolean;
}) {
  const Icon = leaf.icon;
  if (collapsed) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={leaf.href}
              className={cn(
                "flex items-center justify-center px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/5",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
              aria-label={leaf.name}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {leaf.name}
          </TooltipContent>
        </Tooltip>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={leaf.href}
        className={cn(
          "flex items-center gap-3 rounded-md text-sm transition-colors hover:bg-white/5",
          compact ? "px-2 py-1.5 text-[13px]" : "px-3 py-2",
          active
            ? "bg-primary/15 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{leaf.name}</span>
      </Link>
    </li>
  );
}
