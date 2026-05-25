import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import {
  Layers,
  ShieldAlert,
  KeyRound,
  Boxes,
  Cpu,
  Network,
  ServerCog,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { EmptyState } from "@/components/Common/EmptyState";
import { Card, CardContent } from "@/components/ui/shared";
import { Badge } from "@/components/ui/badge";
import { OemMark } from "@/components/Brand";
import { RagBadge } from "@/components/Common/RagBadge";
import { useFeeder } from "@/components/Feeder";
import { operationsFor } from "@/components/Dashboard/OperationsPanel";
import {
  FUNCTIONAL_DOMAINS,
  FUNCTIONAL_DOMAIN_SLUG,
  FUNCTIONAL_DOMAIN_BY_SLUG,
  type FunctionalDomain,
  type RagStatus,
  type Tool,
} from "@/types/tool";
import { cn } from "@/lib/utils";

const DOMAIN_ICON: Record<FunctionalDomain, typeof Layers> = {
  "Perimeter & Edge": ShieldAlert,
  "Identity & Access": KeyRound,
  "Workload & Data": Boxes,
  "Endpoint Rigs": Cpu,
  "Network Plumbing": Network,
  "Firewall Controller": ServerCog,
};

const DOMAIN_TAGLINE: Record<FunctionalDomain, string> = {
  "Perimeter & Edge": "Public-facing traffic, boundary defense, edge mitigation.",
  "Identity & Access": "Privileged access, MFA, session brokering.",
  "Workload & Data": "Workload isolation, data-at-rest, secure transfer.",
  "Endpoint Rigs": "EDR / XDR / HIPS across the endpoint fleet.",
  "Network Plumbing": "DNS / DHCP / IPAM, NAC, switch ingress control.",
  "Firewall Controller": "Centralized policy + management + log/analytics plane.",
};

const STRIPE: Record<RagStatus, string> = {
  red: "lstripe-red",
  amber: "lstripe-amber",
  green: "lstripe-green",
};

const RAG_RANK: Record<RagStatus, number> = { red: 0, amber: 1, green: 2 };

interface DomainRow {
  domain: FunctionalDomain;
  tools: Tool[];
  observed: number;
  denom: number;
  worstStatus: RagStatus;
  vectors: string[];
}

function rollUpByDomain(tools: Tool[]): DomainRow[] {
  const map = new Map<FunctionalDomain, DomainRow>();
  for (const d of FUNCTIONAL_DOMAINS) {
    map.set(d, {
      domain: d,
      tools: [],
      observed: 0,
      denom: 0,
      worstStatus: "green",
      vectors: [],
    });
  }
  for (const t of tools) {
    if (!t.functionalDomain) continue;
    const row = map.get(t.functionalDomain);
    if (!row) continue;
    row.tools.push(t);
    row.observed += t.observed;
    row.denom += t.denominator;
    if (t.status === "red") row.worstStatus = "red";
    else if (t.status === "amber" && row.worstStatus !== "red") row.worstStatus = "amber";
    const ops = operationsFor(t.id);
    if (ops) for (const v of ops.collectionVectors) if (!row.vectors.includes(v)) row.vectors.push(v);
  }
  return Array.from(map.values()).sort(
    (a, b) => RAG_RANK[a.worstStatus] - RAG_RANK[b.worstStatus] || b.tools.length - a.tools.length,
  );
}

export default function FunctionalDomains() {
  const [, params] = useRoute<{ slug?: string }>("/domains/:slug");
  const { tools } = useFeeder();
  const rows = useMemo(() => rollUpByDomain(tools), [tools]);

  const focusedDomain = params?.slug ? FUNCTIONAL_DOMAIN_BY_SLUG[params.slug] : undefined;
  if (params?.slug && !focusedDomain) {
    return (
      <div className="space-y-6">
        <PageHeader title="Functional Domain not found" icon={Layers} />
        <EmptyState
          title="Unknown domain"
          description={`No functional domain with slug "${params.slug}".`}
        />
      </div>
    );
  }

  if (focusedDomain) {
    return <DomainDetail domain={focusedDomain} tools={tools.filter((t) => t.functionalDomain === focusedDomain)} />;
  }

  const orphanCount = tools.filter((t) => !t.functionalDomain).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tool Landscape — by Functional Domain"
        icon={Layers}
        description="The SecOps operational lens. Six functional domains describe how the team monitors and administers each tool day-to-day — orthogonal to the Security Tower view."
        breadcrumb={[{ label: "Tool Landscape" }, { label: "by Functional Domain" }]}
        meta={`${FUNCTIONAL_DOMAINS.length} domains · ${tools.length} tools`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map((r) => {
          const Icon = DOMAIN_ICON[r.domain];
          const pct = r.denom > 0 ? (r.observed / r.denom) * 100 : 0;
          return (
            <Link
              key={r.domain}
              href={`/domains/${FUNCTIONAL_DOMAIN_SLUG[r.domain]}`}
              className={cn(
                "block rounded-lg border hairline bg-card hover:bg-card/80 transition-colors",
                STRIPE[r.worstStatus],
              )}
            >
              <div className="p-4 space-y-2.5">
                <header className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-md bg-primary/10 border border-primary/30 inline-flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold">{r.domain}</h2>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {r.tools.length} {r.tools.length === 1 ? "tool" : "tools"} ·{" "}
                        {pct.toFixed(1)}% visible
                      </div>
                    </div>
                  </div>
                  <RagBadge status={r.worstStatus} showLabel={false} />
                </header>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {DOMAIN_TAGLINE[r.domain]}
                </p>
                {r.tools.length > 0 && (
                  <ul className="flex items-center gap-1.5 flex-wrap pt-1 border-t hairline-t">
                    {r.tools.slice(0, 6).map((t) => (
                      <li key={t.id}>
                        <OemMark oem={t.oem} size={20} />
                      </li>
                    ))}
                    {r.tools.length > 6 && (
                      <li className="text-[10px] font-mono text-muted-foreground">
                        +{r.tools.length - 6}
                      </li>
                    )}
                  </ul>
                )}
                {r.vectors.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap text-[10px] font-mono text-muted-foreground">
                    {r.vectors.slice(0, 4).map((v) => (
                      <Badge
                        key={v}
                        variant="outline"
                        className="text-[9px] font-mono py-0 h-4"
                      >
                        {v}
                      </Badge>
                    ))}
                    {r.vectors.length > 4 && <span>+{r.vectors.length - 4}</span>}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {orphanCount > 0 && (
        <Card className="glass-panel">
          <CardContent className="p-3 text-[11px] text-muted-foreground">
            {orphanCount} tool{orphanCount === 1 ? "" : "s"} not yet assigned to a Functional
            Domain. Set <code>functionalDomain</code> on each seed in <code>tools.json</code> to
            roll them into a domain.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DomainDetail({ domain, tools }: { domain: FunctionalDomain; tools: Tool[] }) {
  const Icon = DOMAIN_ICON[domain];
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Functional Domain — ${domain}`}
        icon={Icon}
        description={DOMAIN_TAGLINE[domain]}
        breadcrumb={[
          { label: "Tool Landscape" },
          { label: "by Functional Domain", href: "/domains" },
          { label: domain },
        ]}
        meta={`${tools.length} tools`}
        actions={
          <Link
            href="/domains"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            All domains
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        }
      />

      <Card className="glass-panel">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b hairline-b text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              <tr>
                <th scope="col" className="text-left px-3 py-2">
                  <span className="sr-only">Vendor</span>
                </th>
                <th scope="col" className="text-left px-3 py-2">Tool</th>
                <th scope="col" className="text-left px-3 py-2">Collection vector</th>
                <th scope="col" className="text-left px-3 py-2">Critical alert threshold</th>
                <th scope="col" className="text-left px-3 py-2">Daily change points</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t) => {
                const ops = operationsFor(t.id);
                return (
                  <tr key={t.id} className="border-b hairline-b last:border-0 align-top">
                    <td className="px-3 py-2.5 align-top">
                      <OemMark oem={t.oem} size={22} />
                    </td>
                    <td className="px-3 py-2.5 align-top min-w-[10rem]">
                      <Link
                        href={`/tools/${t.id}`}
                        className="font-medium text-xs hover:text-primary"
                      >
                        {t.solution}
                      </Link>
                      <div className="text-[10px] font-mono text-muted-foreground">{t.oem}</div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {ops ? (
                        <div className="flex flex-wrap gap-1">
                          {ops.collectionVectors.map((v) => (
                            <Badge
                              key={v}
                              variant="outline"
                              className="text-[9px] font-mono py-0 h-4"
                            >
                              {v}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-muted-foreground italic">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top text-[11px] text-muted-foreground leading-snug max-w-md">
                      {ops?.criticalAlertThreshold ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 align-top text-[11px] text-muted-foreground leading-snug max-w-md">
                      {ops?.dailyChangePoints && ops.dailyChangePoints.length > 0 ? (
                        <ul className="space-y-0.5">
                          {ops.dailyChangePoints.slice(0, 2).map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                          {ops.dailyChangePoints.length > 2 && (
                            <li className="text-[10px] font-mono">
                              +{ops.dailyChangePoints.length - 2} more
                            </li>
                          )}
                        </ul>
                      ) : (
                        "—"
                      )}
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
