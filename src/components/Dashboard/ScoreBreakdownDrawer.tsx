import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScoreBreakdown } from "./ScoreBreakdown";
import type { Tool } from "@/types/tool";

interface ScoreBreakdownDrawerProps {
  tool: Tool | null;
  freshnessSloHours: number;
  onOpenChange: (open: boolean) => void;
}

export function ScoreBreakdownDrawer({
  tool,
  freshnessSloHours,
  onOpenChange,
}: ScoreBreakdownDrawerProps) {
  return (
    <Sheet open={tool !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto p-6"
        aria-describedby={undefined}
      >
        {tool && (
          <>
            <SheetHeader className="pb-4 mb-2 border-b border-white/5">
              <SheetTitle className="text-lg">{tool.solution}</SheetTitle>
              <SheetDescription className="text-xs font-mono">
                {tool.oem} · {tool.hosting}
              </SheetDescription>
            </SheetHeader>
            <ScoreBreakdown tool={tool} freshnessSloHours={freshnessSloHours} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
