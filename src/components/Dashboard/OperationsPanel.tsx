import { Antenna, Cable, BellRing, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import operationsRaw from "../../../workspaces/abcl/operations.json";
import {
  OperationsFileSchema,
  type CollectionVector,
  type TelemetryEndpoint,
  type ToolOperations,
} from "@/types/operations";

const OPS_DATA = OperationsFileSchema.safeParse(operationsRaw);
const OPS_BY_TOOL = new Map<string, ToolOperations>();
if (OPS_DATA.success) {
  for (const o of OPS_DATA.data.operations) OPS_BY_TOOL.set(o.toolId, o);
}

const VECTOR_TONE: Record<CollectionVector, string> = {
  SNMPv3: "border-[#0099CC]/40 text-[#0099CC] bg-[#0099CC]/10",
  "REST API": "border-primary/40 text-primary bg-primary/10",
  Syslog: "border-[#22C55E]/30 text-[#4ADE80] bg-[#22C55E]/10",
  Webhook: "border-[#A855F7]/40 text-[#C084FC] bg-[#A855F7]/10",
  "File-tail": "border-[#F59E0B]/40 text-[#F59E0B] bg-[#F59E0B]/10",
  Database: "border-[#EC4899]/40 text-[#F472B6] bg-[#EC4899]/10",
  "Windows Event Log": "border-[#3B82F6]/40 text-[#60A5FA] bg-[#3B82F6]/10",
  Agent: "border-[#06B6D4]/40 text-[#22D3EE] bg-[#06B6D4]/10",
};

const ENDPOINT_KIND_TONE: Record<NonNullable<TelemetryEndpoint["kind"]>, string> = {
  OID: "text-[#0099CC]",
  API: "text-primary",
  Log: "text-[#4ADE80]",
  Metric: "text-[#F59E0B]",
};

interface OperationsPanelProps {
  toolId: string;
  oem: string;
}

export function OperationsPanel({ toolId, oem }: OperationsPanelProps) {
  const ops = OPS_BY_TOOL.get(toolId);
  if (!ops) return null;

  return (
    <Card className="glass-panel">
      <CardContent className="p-4 space-y-4">
        <header>
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Operational telemetry
          </div>
          <h3 className="text-sm font-semibold mt-0.5">How this tool is monitored</h3>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            Collection vectors, telemetry endpoints, alert thresholds, and the day-to-day
            administrative touch points an operator owns in the {oem} console.
          </p>
        </header>

        <section className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground flex items-center gap-1.5">
            <Antenna className="h-3 w-3" aria-hidden="true" />
            Collection vectors
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ops.collectionVectors.map((v) => (
              <Badge
                key={v}
                variant="outline"
                className={cn("text-[10px] font-mono", VECTOR_TONE[v])}
              >
                {v}
              </Badge>
            ))}
          </div>
        </section>

        {ops.telemetryEndpoints.length > 0 && (
          <section className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground flex items-center gap-1.5">
              <Cable className="h-3 w-3" aria-hidden="true" />
              Telemetry endpoints
            </div>
            <ul className="space-y-1">
              {ops.telemetryEndpoints.map((ep, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-2 text-xs leading-snug"
                >
                  {ep.kind && (
                    <span
                      className={cn(
                        "shrink-0 text-[9px] font-mono uppercase tracking-widest",
                        ENDPOINT_KIND_TONE[ep.kind],
                      )}
                    >
                      {ep.kind}
                    </span>
                  )}
                  <span className="text-muted-foreground shrink-0">{ep.label}</span>
                  <code className="text-[10px] font-mono text-foreground bg-background/40 rounded px-1.5 py-0.5 border border-border break-all">
                    {ep.value}
                  </code>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground flex items-center gap-1.5">
            <BellRing className="h-3 w-3 text-[#F87171]" aria-hidden="true" />
            Critical alert threshold
          </div>
          <p className="text-xs text-foreground leading-relaxed rounded border border-[#EF4444]/30 bg-[#EF4444]/5 px-3 py-2">
            {ops.criticalAlertThreshold}
          </p>
        </section>

        {ops.dailyChangePoints.length > 0 && (
          <section className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground flex items-center gap-1.5">
              <Wrench className="h-3 w-3" aria-hidden="true" />
              Daily admin change points
            </div>
            <ul className="space-y-0.5">
              {ops.dailyChangePoints.map((c, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground flex items-start gap-1.5 leading-snug"
                >
                  <span
                    className="shrink-0 mt-1.5 inline-block rounded-full bg-muted-foreground h-1 w-1"
                    aria-hidden="true"
                  />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

/** Pure data lookup, exported so the Functional Domain view can render a matrix table. */
export function operationsFor(toolId: string): ToolOperations | undefined {
  return OPS_BY_TOOL.get(toolId);
}
