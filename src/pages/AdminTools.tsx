import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Boxes, ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AdminGate } from "@/components/Admin/AdminGate";
import { OemMark } from "@/components/Brand";
import { adminApi } from "@/lib/admin-api";
import { DemoWatermark } from "@/components/Common/DemoWatermark";
import { toast } from "sonner";

type ToolRow = Awaited<ReturnType<typeof adminApi.tools>>["tools"][number];

export default function AdminTools() {
  return <AdminGate>{() => <AdminToolsInner />}</AdminGate>;
}

function AdminToolsInner() {
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [drafts, setDrafts] = useState<
    Record<string, { denominator?: number; webhookEnabled?: boolean }>
  >({});
  const [busy, setBusy] = useState<string | null>(null);

  const reload = async () => {
    const r = await adminApi.tools();
    setTools(r.tools);
  };

  useEffect(() => {
    reload().catch((e) =>
      toast.error("Failed to load tools", { description: (e as Error).message }),
    );
  }, []);

  const setDraft = (id: string, patch: { denominator?: number; webhookEnabled?: boolean }) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const saveDraft = async (id: string) => {
    const patch = drafts[id];
    if (!patch || Object.keys(patch).length === 0) return;
    setBusy(id);
    try {
      await adminApi.patchTool(id, patch);
      toast.success("Saved");
      setDrafts((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
      await reload();
    } catch (e) {
      toast.error("Save failed", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tools"
        icon={Boxes}
        description="Edit denominator, severity, and webhook toggle. Changes apply to the canonical server state immediately."
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Tools" }]}
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
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead className="border-b border-white/5 text-[10px] uppercase font-mono tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2"></th>
                <th className="text-left px-3 py-2">Tool</th>
                <th className="text-left px-3 py-2">Severity</th>
                <th className="text-right px-3 py-2">Denominator</th>
                <th className="text-center px-3 py-2">Webhook</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t) => {
                const draft = drafts[t.id];
                const dirty = !!draft && Object.keys(draft).length > 0;
                return (
                  <tr key={t.id} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2">
                      <OemMark oem={t.seed.oem} size={28} />
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/tools/${t.id}`} className="font-medium hover:text-primary">
                        {t.seed.solution}
                      </Link>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {t.seed.oem} · {t.seed.tower}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {t.seed.severity}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        min={1}
                        defaultValue={t.seed.denominator}
                        onChange={(e) =>
                          setDraft(t.id, {
                            denominator: Number(e.target.value) || t.seed.denominator,
                          })
                        }
                        className="h-7 w-28 text-right text-xs ml-auto"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch
                        defaultChecked={t.webhookEnabled}
                        onCheckedChange={(v) => setDraft(t.id, { webhookEnabled: v })}
                        aria-label={`Webhook for ${t.seed.solution}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant={dirty ? "default" : "outline"}
                        disabled={!dirty || busy === t.id}
                        onClick={() => saveDraft(t.id)}
                      >
                        <Save className="h-3 w-3 mr-1.5" />
                        Save
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
