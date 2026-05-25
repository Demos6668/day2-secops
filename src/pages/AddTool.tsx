import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, Plus, Webhook } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { addOverlaySeed } from "@/lib/workspace-overlay";
import { useWorkspace } from "@/lib/workspace";
import {
  ToolSeedSchema,
  type MockProfile,
  type Severity,
  type ToolSeed,
  type Tower,
} from "@/types/tool";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Draft = Partial<ToolSeed> & { webhookUrl?: string };

const STEPS = [
  "Identity",
  "Severity",
  "OEM",
  "Hosting",
  "Denominator",
  "Profile + webhook",
] as const;
type StepName = (typeof STEPS)[number];

const TOWER_OPTIONS: Tower[] = [
  "Endpoint Security",
  "Application Security",
  "Network Security",
  "Data Security",
  "Identity Security",
];
const SEVERITY_OPTIONS: Severity[] = ["Critical", "Moderate", "Low"];
const PROFILE_OPTIONS: MockProfile[] = ["healthy", "degraded", "flapping", "stale"];

export default function AddTool() {
  const [, setLocation] = useLocation();
  const { toolSeeds } = useWorkspace();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({ mockProfile: "healthy" });

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [k]: v }));

  const stepValid = (s: StepName): boolean => {
    switch (s) {
      case "Identity":
        return Boolean(draft.id && draft.solution && draft.tower);
      case "Severity":
        return Boolean(draft.severity);
      case "OEM":
        return Boolean(draft.oem);
      case "Hosting":
        return Boolean(draft.hosting);
      case "Denominator":
        return typeof draft.denominator === "number" && draft.denominator > 0;
      case "Profile + webhook":
        return Boolean(draft.mockProfile);
    }
  };

  const canAdvance = stepValid(STEPS[step]);
  const isLast = step === STEPS.length - 1;

  const submit = () => {
    const parse = ToolSeedSchema.safeParse(draft);
    if (!parse.success) {
      toast.error("Form invalid", { description: parse.error.issues[0]?.message });
      return;
    }
    if (toolSeeds.some((t) => t.id === parse.data.id)) {
      toast.error(`Tool id "${parse.data.id}" already exists in the seed.`);
      return;
    }
    try {
      addOverlaySeed(parse.data);
      toast.success(`Added "${parse.data.solution}" to overlay.`);
      setLocation("/");
    } catch (e) {
      toast.error("Could not add tool", { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Add Tool"
        icon={Plus}
        description="Plug-and-play wizard. The new tool surfaces on the dashboard immediately and is persisted to the workspace overlay."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              Cancel
            </Link>
          </Button>
        }
      />

      <ol className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={cn(
              "flex-1 flex items-center gap-1 border-b pb-1.5",
              i < step && "border-[#22C55E] text-[#22C55E]",
              i === step && "border-primary text-primary",
              i > step && "border-border text-muted-foreground",
            )}
          >
            {i < step && <CheckCircle2 className="h-3 w-3" />}
            <span className="truncate">
              {i + 1}. {s}
            </span>
          </li>
        ))}
      </ol>

      <Card className="glass-panel">
        <CardContent className="p-5 space-y-4">
          {step === 0 && (
            <div className="space-y-3">
              <Field label="Tool ID (kebab/camel)">
                <Input
                  value={draft.id ?? ""}
                  onChange={(e) => set("id", e.target.value.trim())}
                  placeholder="e.g. crowdstrikeFalcon"
                  className="h-8"
                />
              </Field>
              <Field label="Solution name">
                <Input
                  value={draft.solution ?? ""}
                  onChange={(e) => set("solution", e.target.value)}
                  placeholder="e.g. Endpoint Detection &amp; Response"
                  className="h-8"
                />
              </Field>
              <Field label="Tower">
                <RadioGroup
                  value={draft.tower ?? ""}
                  onValueChange={(v) => set("tower", v as Tower)}
                  className="grid grid-cols-3 gap-2"
                >
                  {TOWER_OPTIONS.map((t) => (
                    <ChoiceCard key={t} value={t} selected={draft.tower === t} label={t} />
                  ))}
                </RadioGroup>
              </Field>
            </div>
          )}

          {step === 1 && (
            <Field label="Severity">
              <RadioGroup
                value={draft.severity ?? ""}
                onValueChange={(v) => set("severity", v as Severity)}
                className="grid grid-cols-3 gap-2"
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <ChoiceCard key={s} value={s} selected={draft.severity === s} label={s} />
                ))}
              </RadioGroup>
            </Field>
          )}

          {step === 2 && (
            <Field label="OEM / vendor">
              <Input
                value={draft.oem ?? ""}
                onChange={(e) => set("oem", e.target.value)}
                placeholder="e.g. CrowdStrike"
                className="h-8"
              />
            </Field>
          )}

          {step === 3 && (
            <Field label="Hosting">
              <Input
                value={draft.hosting ?? ""}
                onChange={(e) => set("hosting", e.target.value)}
                placeholder="e.g. SaaS, Private cloud, Physical 2 nodes"
                className="h-8"
              />
            </Field>
          )}

          {step === 4 && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Denominator (expected assets)">
                <Input
                  type="number"
                  min={1}
                  value={draft.denominator ?? ""}
                  onChange={(e) => set("denominator", Number(e.target.value))}
                  placeholder="e.g. 12000"
                  className="h-8"
                />
              </Field>
              <Field label="Unit (optional)">
                <Input
                  value={draft.denominatorUnit ?? ""}
                  onChange={(e) => set("denominatorUnit", e.target.value)}
                  placeholder="endpoints, users, fqdn…"
                  className="h-8"
                />
              </Field>
              <Field label="Category (optional)">
                <Input
                  value={draft.category ?? ""}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder="e.g. edr-hips"
                  className="h-8"
                />
              </Field>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <Field label="Visibility profile">
                <RadioGroup
                  value={draft.mockProfile ?? "healthy"}
                  onValueChange={(v) => set("mockProfile", v as MockProfile)}
                  className="grid grid-cols-2 gap-2"
                >
                  {PROFILE_OPTIONS.map((p) => (
                    <ChoiceCard key={p} value={p} selected={draft.mockProfile === p} label={p} />
                  ))}
                </RadioGroup>
              </Field>
              <Field label="Webhook URL (optional)">
                <Input
                  value={draft.webhookUrl ?? ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, webhookUrl: e.target.value }))}
                  placeholder="https://your.internal/visibility/<tool-id>"
                  className="h-8"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  <Webhook className="inline h-3 w-3 mr-1" />
                  Inbound HMAC-signed visibility events arrive on this endpoint.
                </p>
              </Field>
            </div>
          )}
        </CardContent>

        <div className="border-t border-white/5 px-5 py-3 flex items-center justify-between bg-background/40">
          <Button
            variant="ghost"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ArrowLeft className="h-3 w-3 mr-1.5" />
            Back
          </Button>
          {isLast ? (
            <Button size="sm" disabled={!canAdvance} onClick={submit}>
              Add tool
              <CheckCircle2 className="h-3 w-3 ml-1.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!canAdvance}
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              Next
              <ArrowRight className="h-3 w-3 ml-1.5" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ChoiceCard({
  value,
  selected,
  label,
}: {
  value: string;
  selected: boolean;
  label: string;
}) {
  return (
    <label
      className={cn(
        "flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer text-xs",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border hover:bg-white/[0.03]",
      )}
    >
      <RadioGroupItem value={value} className="sr-only" />
      <span className="capitalize">{label}</span>
      {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
    </label>
  );
}
