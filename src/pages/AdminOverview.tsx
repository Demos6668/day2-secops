import { useEffect, useState } from "react";
import { Link } from "wouter";
import { LogOut, ShieldCheck, Activity, Plug, Webhook } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminGate } from "@/components/Admin/AdminGate";
import { adminApi } from "@/lib/admin-api";
import { DemoWatermark } from "@/components/Common/DemoWatermark";
import { OemMark } from "@/components/Brand";
import { cn } from "@/lib/utils";

interface CircuitState {
  state: "closed" | "open" | "half-open";
  failures: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
}

const CIRCUIT_TONE: Record<CircuitState["state"], string> = {
  closed: "text-[#4ADE80] border-[#22C55E]/30 bg-[#22C55E]/10",
  "half-open": "text-[#FBBF24] border-[#D97706]/30 bg-[#D97706]/10",
  open: "text-[#F87171] border-[#EF4444]/30 bg-[#EF4444]/10",
};

export default function AdminOverview() {
  return (
    <AdminGate>
      {(user, logout) => <AdminOverviewInner username={user.username} onLogout={logout} />}
    </AdminGate>
  );
}

function AdminOverviewInner({
  username,
  onLogout,
}: {
  username: string;
  onLogout: () => Promise<void>;
}) {
  const [data, setData] = useState<{
    tools: Awaited<ReturnType<typeof adminApi.tools>>["tools"];
    circuits: Awaited<ReturnType<typeof adminApi.tools>>["circuits"];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi.tools().then(
      (r) => !cancelled && setData({ tools: r.tools, circuits: r.circuits }),
      (e) => !cancelled && setErr((e as Error).message),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const enabledCount = data?.tools.filter((t) => t.webhookEnabled).length ?? 0;
  const total = data?.tools.length ?? 0;
  const circuitOpen = data
    ? Object.values(data.circuits).filter((c) => c.state === "open").length
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        icon={ShieldCheck}
        description={`Signed in as ${username}. Day2 SecOps server is canonical for tool state.`}
        breadcrumb={[{ label: "Admin" }]}
        actions={
          <div className="flex items-center gap-2">
            <DemoWatermark text="DEMO ADMIN" />
            <Button size="sm" variant="ghost" onClick={onLogout}>
              <LogOut className="h-3 w-3 mr-1.5" />
              Logout
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Activity} label="Tools registered" value={String(total)} />
        <StatCard
          icon={Webhook}
          label="Webhooks enabled"
          value={`${enabledCount} / ${total}`}
          accent={enabledCount < total ? "amber" : "green"}
        />
        <StatCard
          icon={Plug}
          label="Open circuits"
          value={String(circuitOpen)}
          accent={circuitOpen > 0 ? "red" : "green"}
        />
        <Link href="/admin/integrations">
          <StatCard icon={Plug} label="Integration recipes" value="View →" interactive />
        </Link>
      </div>

      {err && (
        <Card className="glass-panel border-[#EF4444]/40">
          <CardContent className="p-3 text-xs text-[#F87171] font-mono">{err}</CardContent>
        </Card>
      )}

      <Card className="glass-panel">
        <CardContent className="p-4 space-y-3">
          <header className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Receiver status
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/tools">Edit tools →</Link>
            </Button>
          </header>
          {data ? (
            <ul className="divide-y divide-white/5">
              {data.tools.map((t) => {
                const circuit = data.circuits[t.id];
                return (
                  <li key={t.id} className="py-2 flex items-center gap-3 text-xs">
                    <OemMark oem={t.seed.oem} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{t.seed.solution}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {t.seed.oem} · {t.seed.tower} · {t.seed.severity}
                      </div>
                    </div>
                    {t.webhookEnabled ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-[#4ADE80] border-[#22C55E]/30"
                      >
                        Webhook live
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Webhook off
                      </Badge>
                    )}
                    {circuit && (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] font-mono", CIRCUIT_TONE[circuit.state])}
                      >
                        {circuit.state} ({circuit.failures})
                      </Badge>
                    )}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/webhooks/${t.id}`}>Manage →</Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="divide-y divide-white/5" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="py-2 flex items-center gap-3">
                  <Skeleton className="h-7 w-7 rounded" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-2.5 w-28" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent = "default",
  interactive = false,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  accent?: "default" | "green" | "amber" | "red";
  interactive?: boolean;
}) {
  const tone =
    accent === "red"
      ? "border-[#EF4444]/30"
      : accent === "amber"
        ? "border-[#D97706]/30"
        : accent === "green"
          ? "border-[#22C55E]/30"
          : "border-white/5";
  return (
    <Card
      className={cn(
        "glass-panel border",
        tone,
        interactive && "cursor-pointer hover:border-primary/60 transition-colors",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </div>
        <div className="text-2xl font-bold mt-1 text-num truncate">{value}</div>
      </CardContent>
    </Card>
  );
}
