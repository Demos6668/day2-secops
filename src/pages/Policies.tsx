import { Link } from "wouter";
import { Gavel, ScrollText, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PolicyEntry {
  id: string;
  title: string;
  scope: string;
  summary: string;
  version: string;
  effectiveFrom: string;
}

const POLICIES: PolicyEntry[] = [
  {
    id: "pol-acceptable-use",
    title: "Acceptable use",
    scope: "All employees and contractors",
    summary:
      "Permitted and prohibited uses of company IT assets, internet access, email, and removable media. Defines the line between professional and personal use.",
    version: "v3.2",
    effectiveFrom: "2026-01-01",
  },
  {
    id: "pol-password",
    title: "Password and credential management",
    scope: "All identities (workforce + service accounts)",
    summary:
      "Minimum complexity, rotation cadence, vaulting requirements for privileged accounts, MFA enrollment thresholds, and break-glass account governance.",
    version: "v2.1",
    effectiveFrom: "2025-10-15",
  },
  {
    id: "pol-data-classification",
    title: "Data classification and handling",
    scope: "All custodians of business data",
    summary:
      "Four-tier classification (Public, Internal, Confidential, Restricted) with required controls at each tier: encryption, access review, retention, secure deletion.",
    version: "v4.0",
    effectiveFrom: "2026-02-01",
  },
  {
    id: "pol-vendor-security-review",
    title: "Vendor security review",
    scope: "Procurement + business unit owners onboarding any third party",
    summary:
      "Required questionnaire, evidence requests, risk scoring, and re-attestation cadence for every vendor that handles ABCL data or integrates with ABCL systems.",
    version: "v1.5",
    effectiveFrom: "2025-08-01",
  },
];

export default function Policies() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Policies"
        icon={Gavel}
        description="Formal governance documents that bind business units. Each policy carries a version, scope, and effective date."
        breadcrumb={[{ label: "SOPs", href: "/sops" }, { label: "Policies" }]}
        meta={`${POLICIES.length} active`}
        actions={
          <Button asChild size="sm" variant="ghost">
            <Link href="/sops">
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              SOPs
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {POLICIES.map((p) => (
          <Card key={p.id} className="glass-panel">
            <CardContent className="p-4 space-y-3">
              <header>
                <div className="flex items-center gap-2 flex-wrap">
                  <ScrollText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <h2 className="text-sm font-semibold">{p.title}</h2>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {p.version}
                  </Badge>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">
                  scope · {p.scope} · effective from {p.effectiveFrom}
                </div>
              </header>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.summary}</p>
              <div className="pt-1 border-t hairline-t flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">
                  Policy ID · {p.id}
                </span>
                <span className="text-[11px] text-muted-foreground italic">
                  Full text — Phase-real
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
