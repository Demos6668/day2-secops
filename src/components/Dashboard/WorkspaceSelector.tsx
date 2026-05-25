import { ChevronDown, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface WorkspaceSelectorProps {
  current: { id: string; name: string };
  workspaces: { id: string; name: string }[];
  onChange?: (id: string) => void;
}

export function WorkspaceSelector({ current, workspaces, onChange }: WorkspaceSelectorProps) {
  const others = workspaces.filter((w) => w.id !== current.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 text-xs font-medium"
          aria-label="Switch workspace"
        >
          <Building2 className="h-4 w-4" />
          <span className="truncate max-w-[14rem]">{current.name}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Active workspace
        </DropdownMenuLabel>
        <DropdownMenuItem disabled className="text-xs">
          {current.name}
          <span className="ml-auto text-[10px] font-mono text-primary">current</span>
        </DropdownMenuItem>
        {others.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Other workspaces
            </DropdownMenuLabel>
            {others.map((w) => (
              <DropdownMenuItem key={w.id} className="text-xs" onSelect={() => onChange?.(w.id)}>
                {w.name}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
