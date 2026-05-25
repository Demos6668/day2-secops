import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useWorkspace } from "@/lib/workspace";
import { useFeeder } from "@/components/Feeder";
import { CAUSES, CAUSE_ORDER } from "@/lib/visibility/causes";
import { CAUSE_ICONS } from "@/lib/visibility/cause-icons";
import { getRagToken } from "@/lib/rag-tokens";
import {
  Boxes,
  Building2,
  ChevronRight,
  GitCompareArrows,
  LayoutDashboard,
  Plus,
  Share2,
  ShieldCheck,
} from "lucide-react";
import type { VisibilityCauseFlag } from "@/types/tool";

const SAMPLE_QUERIES = [
  "red tools",
  "endpoint coverage",
  "CyberArk",
  "agent_silent",
  "ISO 27001 A.5.9",
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { frameworks } = useWorkspace();
  const { tools } = useFeeder();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("abcl-secviz:open-command", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("abcl-secviz:open-command", onOpenEvent);
    };
  }, []);

  const oems = useMemo(() => Array.from(new Set(tools.map((t) => t.oem))).sort(), [tools]);

  const go = (path: string) => {
    setOpen(false);
    setLocation(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search tools, OEMs, causes, controls…" />
      <CommandList>
        <CommandEmpty>
          <div className="text-xs">
            No matches. Try one of:
            <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
              {SAMPLE_QUERIES.map((q) => (
                <span
                  key={q}
                  className="px-2 py-0.5 rounded border border-border bg-background/40 font-mono text-[10px]"
                >
                  {q}
                </span>
              ))}
            </div>
          </div>
        </CommandEmpty>

        <CommandGroup heading="Navigate">
          <Nav icon={LayoutDashboard} label="Dashboard" onSelect={() => go("/")} />
          <Nav icon={Boxes} label="Tool Inventory" onSelect={() => go("/tools")} />
          <Nav icon={Plus} label="Add Tool" onSelect={() => go("/tools/new")} />
          <Nav icon={ShieldCheck} label="Audit" onSelect={() => go("/audit")} />
          <Nav icon={GitCompareArrows} label="Change Management" onSelect={() => go("/change")} />
          <Nav icon={Share2} label="Feasibility" onSelect={() => go("/feasibility")} />
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Tools">
          {tools.map((t) => {
            const ragColor = getRagToken(t.status).hex;
            return (
              <CommandItem
                key={t.id}
                value={`${t.solution} ${t.oem} ${t.tower} ${t.severity}`}
                onSelect={() => go(`/tools/${t.id}`)}
              >
                <span
                  aria-hidden
                  className="inline-block w-1.5 h-1.5 rounded-full mr-2"
                  style={{ background: ragColor }}
                />
                <span className="flex-1 truncate">{t.solution}</span>
                <span className="ml-2 text-[10px] font-mono text-muted-foreground truncate">
                  {t.oem} · {t.tower}
                </span>
                <ChevronRight className="ml-1 h-3 w-3 opacity-50" />
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="OEMs">
          {oems.map((oem) => (
            <CommandItem
              key={oem}
              value={`oem ${oem}`}
              onSelect={() => go(`/tools?oem=${encodeURIComponent(oem)}`)}
            >
              <Building2 className="mr-2 h-3 w-3 text-muted-foreground" />
              {oem}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Cause flags">
          {CAUSE_ORDER.map((c: VisibilityCauseFlag) => {
            const Icon = CAUSE_ICONS[c];
            return (
              <CommandItem
                key={c}
                value={`cause ${c} ${CAUSES[c].label}`}
                onSelect={() => go(`/?cause=${c}`)}
              >
                <Icon className="mr-2 h-3 w-3 text-muted-foreground" />
                <span className="flex-1">{CAUSES[c].label}</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {CAUSES[c].weight}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Audit controls">
          {frameworks.flatMap((f) =>
            f.controls.map((ctrl) => (
              <CommandItem
                key={`${f.id}-${ctrl.id}`}
                value={`${f.shortName} ${ctrl.id} ${ctrl.title}`}
                onSelect={() => go(`/audit/${f.id}#${ctrl.id}`)}
              >
                <ShieldCheck className="mr-2 h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-[10px] mr-2">{f.shortName}</span>
                <span className="font-mono text-[10px] mr-2">{ctrl.id}</span>
                <span className="flex-1 truncate text-xs">{ctrl.title}</span>
              </CommandItem>
            )),
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function Nav({
  icon: Icon,
  label,
  onSelect,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={label} onSelect={onSelect}>
      <Icon className="mr-2 h-3 w-3" />
      {label}
    </CommandItem>
  );
}
