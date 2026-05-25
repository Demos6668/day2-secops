import { Link } from "wouter";
import { ScrollText, Gavel, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Badge } from "@/components/ui/badge";

interface SopEntry {
  id: string;
  title: string;
  summary: string;
  owner: string;
  reviewCycle: string;
  lastReviewed: string;
}

const SOPS: SopEntry[] = [
  {
    id: "sop-incident-response",
    title: "Incident response runbook",
    summary:
      "Triage, containment, eradication, recovery, and post-mortem steps for a confirmed security incident. Escalation matrix + comms templates.",
    owner: "SOC lead",
    reviewCycle: "Quarterly",
    lastReviewed: "2026-03-12",
  },
  {
    id: "sop-change-approval",
    title: "Security change approval",
    summary:
      "Workflow for proposing, reviewing, and approving security-impacting changes (firewall rules, WAF policies, MFA factor adds/removes).",
    owner: "Change advisory board",
    reviewCycle: "Semi-annually",
    lastReviewed: "2026-01-20",
  },
  {
    id: "sop-privileged-access-review",
    title: "Privileged access review",
    summary:
      "Cadence and process for re-attesting PAM vault access. Discovery of orphaned accounts, break-glass usage audit.",
    owner: "IAM ops",
    reviewCycle: "Monthly",
    lastReviewed: "2026-05-05",
  },
  {
    id: "sop-endpoint-quarantine",
    title: "Endpoint quarantine and recovery",
    summary:
      "When an EDR or HIPS detection fires, what isolation tier we apply, what evidence we preserve, and how the user gets re-admitted to network access.",
    owner: "Endpoint ops",
    reviewCycle: "Quarterly",
    lastReviewed: "2026-04-08",
  },
];

export default function Sops() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Standard Operating Procedures"
        icon={ScrollText}
        description="Living runbooks for routine and incident-driven security operations. Each SOP names an owner, review cadence, and last-reviewed date."
        breadcrumb={[{ label: "SOPs" }]}
        meta={`${SOPS.length} runbooks`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SOPS.map((s) => (
          <Card key={s.id} className="glass-panel">
            <CardContent className="p-4 space-y-3">
              <header>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold">{s.title}</h2>
                  <Badge variant="outline" className="text-[10px]">
                    {s.reviewCycle}
                  </Badge>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">
                  owner · {s.owner} · last reviewed {s.lastReviewed}
                </div>
              </header>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.summary}</p>
              <div className="pt-1 border-t hairline-t flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">SOP ID · {s.id}</span>
                <span className="text-[11px] text-muted-foreground italic">
                  Full text — Phase-real
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-panel">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Gavel className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <div className="text-sm font-semibold">Policies</div>
              <div className="text-[11px] text-muted-foreground">
                Acceptable use, password, data classification, vendor security review.
              </div>
            </div>
          </div>
          <Link
            href="/sops/policies"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Open policies <ArrowRight className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
