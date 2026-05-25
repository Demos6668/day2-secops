import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Plug, ArrowLeft, ClipboardCopy, Check, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminGate } from "@/components/Admin/AdminGate";
import { OemMark } from "@/components/Brand";
import { adminApi } from "@/lib/admin-api";
import { DemoWatermark } from "@/components/Common/DemoWatermark";
import { toast } from "sonner";

type Recipe = Awaited<ReturnType<typeof adminApi.integrations>>["recipes"][number];

export default function AdminIntegrations() {
  return <AdminGate>{() => <AdminIntegrationsInner />}</AdminGate>;
}

function AdminIntegrationsInner() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .integrations()
      .then((r) => setRecipes(r.recipes))
      .catch((e) => toast.error("Failed to load recipes", { description: (e as Error).message }));
  }, []);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Copy failed — select manually");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        icon={Plug}
        description="Per-OEM webhook recipes. Hand the curl snippet to whoever administers the vendor console."
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Integrations" }]}
        meta={`${recipes.length} OEMs`}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {recipes.map((r) => (
          <Card key={`${r.oem}-${r.toolId}`} className="glass-panel">
            <CardContent className="p-4 space-y-3">
              <header className="flex items-start gap-3">
                <OemMark oem={r.oem} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-semibold">{r.oem}</h2>
                    <Badge variant="outline" className="text-[10px]">
                      {r.toolId}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    <ExternalLink className="inline h-3 w-3 mr-1" />
                    {r.vendorPath}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/webhooks/${r.toolId}`}>Manage</Link>
                </Button>
              </header>

              <div>
                <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1">
                  Required headers
                </div>
                <ul className="text-[11px] font-mono space-y-0.5">
                  {r.requiredHeaders.map((h) => (
                    <li key={h.name} className="text-muted-foreground">
                      <span className="text-foreground">{h.name}</span>: {h.value}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                    Curl recipe
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px]"
                    onClick={() => copy(r.toolId, r.curl)}
                  >
                    {copied === r.toolId ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <ClipboardCopy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <pre className="text-[10px] font-mono bg-background/60 border border-border rounded p-2 overflow-x-auto whitespace-pre">
                  {r.curl}
                </pre>
              </div>

              {r.notes.length > 0 && (
                <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc pl-4">
                  {r.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
