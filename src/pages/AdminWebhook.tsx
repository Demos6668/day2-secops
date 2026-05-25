import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  Webhook,
  ArrowLeft,
  RefreshCcw,
  Zap,
  Eye,
  EyeOff,
  ClipboardCopy,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/Common/EmptyState";
import { AdminGate } from "@/components/Admin/AdminGate";
import { OemMark } from "@/components/Brand";
import { adminApi } from "@/lib/admin-api";
import { DemoWatermark } from "@/components/Common/DemoWatermark";
import { toast } from "sonner";

type ToolRow = Awaited<ReturnType<typeof adminApi.tools>>["tools"][number];

export default function AdminWebhook() {
  return <AdminGate>{() => <AdminWebhookInner />}</AdminGate>;
}

function AdminWebhookInner() {
  const [, params] = useRoute<{ toolId?: string }>("/admin/webhooks/:toolId");
  const toolId = params?.toolId;
  const [tool, setTool] = useState<ToolRow | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    if (!toolId) return;
    const r = await adminApi.tools();
    setTool(r.tools.find((t) => t.id === toolId) ?? null);
  };

  useEffect(() => {
    reload();
  }, [toolId]);

  if (!toolId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Webhook" icon={Webhook} />
        <EmptyState title="Bad route" description="Missing tool id." />
      </div>
    );
  }

  if (tool === null) {
    return (
      <div className="space-y-6">
        <PageHeader title="Webhook" icon={Webhook} />
        <Card className="glass-panel">
          <CardContent className="p-4 flex items-center gap-4" aria-busy="true">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="p-4 space-y-3" aria-busy="true">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const rotate = async () => {
    setBusy(true);
    try {
      const r = await adminApi.rotateSecret(toolId);
      setSecret(r.secret);
      setRevealed(true);
      toast.success("New secret minted — copy it now, it won't be shown again.");
      await reload();
    } catch (e) {
      toast.error("Rotate failed", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const testFire = async () => {
    try {
      const r = await adminApi.testFire(toolId);
      toast(r.message);
    } catch (e) {
      toast.error("Test-fire failed", { description: (e as Error).message });
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={tool.seed.solution}
        icon={Webhook}
        description={`${tool.seed.oem} · webhook receiver management`}
        breadcrumb={[
          { label: "Admin", href: "/admin" },
          { label: "Webhooks" },
          { label: tool.seed.solution },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <DemoWatermark text="DEMO ADMIN" />
            <Button asChild size="sm" variant="ghost">
              <Link href="/admin">
                <ArrowLeft className="h-3 w-3 mr-1.5" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="glass-panel">
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <OemMark oem={tool.seed.oem} size={48} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{tool.seed.oem}</span>
              <Badge variant="outline" className="text-[10px]">
                {tool.seed.tower}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {tool.seed.severity}
              </Badge>
              {tool.webhookEnabled ? (
                <Badge variant="outline" className="text-[10px] text-[#4ADE80] border-[#22C55E]/30">
                  Webhook enabled
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Webhook disabled
                </Badge>
              )}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground mt-1">
              Tool ID: <code>{tool.id}</code> · Secret stored: {tool.hasSecret ? "yes" : "no"}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardContent className="p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Receiver endpoint
          </div>
          <pre className="text-[11px] font-mono bg-background/60 border border-border rounded p-2 overflow-x-auto">
            POST {`${window.location.origin}/api/webhooks/${toolId}`}
            {"\n"}Headers: Content-Type: application/json
            {"\n"} X-Day2-Signature: sha256=&lt;hmac(secret, body)&gt;
          </pre>
          <p className="text-[10px] text-muted-foreground">
            See{" "}
            <Link href="/admin/integrations" className="hover:text-primary underline">
              Integrations
            </Link>{" "}
            for the full curl recipe per OEM.
          </p>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardContent className="p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            HMAC secret
          </div>
          {secret ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono bg-background/60 border border-border rounded p-2 truncate">
                {revealed ? secret : "•".repeat(64)}
              </code>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setRevealed((v) => !v)}
                aria-label="Toggle reveal"
              >
                {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={copySecret} aria-label="Copy secret">
                {copied ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No secret minted in this session. Rotate to mint one — it will be shown ONCE.
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={rotate} disabled={busy}>
              <RefreshCcw className="h-3 w-3 mr-1.5" />
              Rotate secret
            </Button>
            <Button size="sm" variant="outline" onClick={testFire}>
              <Zap className="h-3 w-3 mr-1.5" />
              Test fire
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
