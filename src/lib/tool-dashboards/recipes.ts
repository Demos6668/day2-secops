/**
 * Per-tool dashboard recipes.
 *
 * Each recipe describes the OEM-native widgets we surface on a tool's detail
 * page — the signals an operator coming from that vendor's own console would
 * expect to see (sourced from each OEM's product docs; see IMPROVEMENTS.md).
 *
 * The numbers are derived deterministically from each tool's denominator +
 * observed count so the demo looks realistic without faking specific facts.
 * The seed counts (52257 users for MFA, 3000 assets for PAM, 33000 endpoints
 * for EDR, etc.) come from the brief.
 */

import type { Tool } from "@/types/tool";

export type StatTone = "ok" | "warn" | "bad" | "neutral";

export interface Stat {
  label: string;
  value: string;
  tone?: StatTone;
  hint?: string;
}

export interface BarSegment {
  label: string;
  pct: number;
  color: string;
}

export interface Widget {
  title: string;
  /** Short note shown under the title; OEM-native terminology. */
  subtitle?: string;
  stats?: Stat[];
  /** Stacked horizontal bar (e.g. block-mode vs detect-mode WAF rules). */
  bar?: BarSegment[];
  /** List of {label, value} pairs — used for "top X" tables. */
  table?: { rows: { label: string; value: string }[]; header?: string[] };
  /** Free-form caption — appears at the bottom of the card. */
  footnote?: string;
}

export interface ToolDashboardRecipe {
  /** Short OEM-style heading shown above the widgets, e.g. "PAS Dashboard". */
  banner: string;
  widgets: Widget[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function pctStr(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function intStr(n: number): string {
  return Math.round(n).toLocaleString();
}

function pseudoRand(seedString: string): () => number {
  let h = 0;
  for (let i = 0; i < seedString.length; i++) h = (h * 31 + seedString.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
}

// ─── Recipes ─────────────────────────────────────────────────────────────

function mfaRecipe(t: Tool): ToolDashboardRecipe {
  const enrolled = t.observed;
  const expected = t.denominator;
  const rand = pseudoRand(`${t.id}-mfa`);
  const push = 0.55 + rand() * 0.08;
  const totp = 0.22 + rand() * 0.05;
  const sms = 0.08 + rand() * 0.04;
  const fido = Math.max(0, 1 - push - totp - sms);
  const signins24h = Math.floor(enrolled * (0.24 + rand() * 0.04));
  const challenged = Math.floor(signins24h * 0.012);
  const blocked = Math.floor(signins24h * 0.0008);
  return {
    banner: "Identity Security — MFA dashboard",
    widgets: [
      {
        title: "Enrollment",
        subtitle: "Eligible users with MFA registered",
        stats: [
          {
            label: "Enrolled",
            value: `${intStr(enrolled)} / ${intStr(expected)}`,
            tone: enrolled / expected > 0.95 ? "ok" : "warn",
          },
          { label: "Coverage", value: pctStr(enrolled / expected) },
          {
            label: "Sticky (30d inactive)",
            value: intStr(expected * 0.022),
            tone: "warn",
            hint: "Users with no MFA challenge in the last 30 days",
          },
        ],
      },
      {
        title: "Authenticator distribution",
        subtitle: "Strongest factor per enrolled user",
        bar: [
          { label: "Push", pct: push, color: "#22C55E" },
          { label: "TOTP", pct: totp, color: "#0095AF" },
          { label: "SMS", pct: sms, color: "#D97706" },
          { label: "FIDO2", pct: fido, color: "#A855F7" },
        ],
        footnote:
          "SMS factors should be migrated to push or FIDO2 — see Identity Security best practices.",
      },
      {
        title: "Last 24h sign-ins",
        stats: [
          { label: "Successful", value: intStr(signins24h), tone: "ok" },
          { label: "Step-up challenged", value: intStr(challenged) },
          { label: "Blocked", value: intStr(blocked), tone: blocked > 0 ? "warn" : "neutral" },
        ],
      },
    ],
  };
}

function pamRecipe(t: Tool): ToolDashboardRecipe {
  const vaulted = t.observed;
  const expected = t.denominator;
  const users = t.secondaryDenominator?.value ?? 2500;
  const rand = pseudoRand(`${t.id}-pam`);
  const activeSessions = Math.floor(20 + rand() * 60);
  const dailySessions = Math.floor(1200 + rand() * 1200);
  const breakGlass = Math.floor(rand() * 4);
  return {
    banner: "Privileged Access — vault & session activity",
    widgets: [
      {
        title: "Vault coverage",
        subtitle: "Privileged accounts under vault control",
        stats: [
          {
            label: "Vaulted",
            value: `${intStr(vaulted)} / ${intStr(expected)} assets`,
            tone: vaulted / expected > 0.95 ? "ok" : "warn",
          },
          { label: "Provisioned users", value: intStr(users) },
          { label: "Rotation success (7d)", value: "99.3%", tone: "ok" },
        ],
      },
      {
        title: "Sessions",
        subtitle: "Recorded privileged sessions",
        stats: [
          { label: "Active now", value: intStr(activeSessions) },
          { label: "Today", value: intStr(dailySessions) },
          {
            label: "Avg session length",
            value: "18 min",
          },
        ],
      },
      {
        title: "Break-glass accounts",
        subtitle: "Emergency access — should be near zero",
        stats: [
          {
            label: "Checked out (24h)",
            value: intStr(breakGlass),
            tone: breakGlass > 1 ? "bad" : breakGlass === 1 ? "warn" : "ok",
            hint: "Any check-out should have an approved ticket and a recording.",
          },
          { label: "Last check-out", value: breakGlass > 0 ? "2h ago" : "—" },
        ],
      },
    ],
  };
}

function wafRecipe(t: Tool): ToolDashboardRecipe {
  const fqdns = t.denominator;
  const protected_ = t.observed;
  const rand = pseudoRand(`${t.id}-waf`);
  const blockMode = 0.78 + rand() * 0.12;
  const detectMode = 1 - blockMode;
  const blockedToday = Math.floor(8000 + rand() * 15000);
  const botPct = 0.34 + rand() * 0.18;
  return {
    banner: t.oem.toLowerCase().includes("imperva")
      ? "WAF Gateway — protection state"
      : "WAAP — protection state",
    widgets: [
      {
        title: "Protected FQDNs",
        subtitle: "Domains routed through the WAF policy plane",
        stats: [
          {
            label: "Protected",
            value: `${intStr(protected_)} / ${intStr(fqdns)}`,
            tone: protected_ / fqdns > 0.9 ? "ok" : "warn",
          },
          { label: "Coverage", value: pctStr(protected_ / fqdns) },
        ],
      },
      {
        title: "Rule mode",
        subtitle: "Block-mode vs detect-mode coverage — block is the goal",
        bar: [
          { label: "Block", pct: blockMode, color: "#22C55E" },
          { label: "Detect", pct: detectMode, color: "#D97706" },
        ],
        footnote:
          "Detect-mode rules log attacks but do not stop them. Aim for ≥ 90% block-mode for OWASP top 10 categories.",
      },
      {
        title: "Last 24h",
        stats: [
          { label: "Requests blocked", value: intStr(blockedToday), tone: "ok" },
          { label: "Bot traffic", value: pctStr(botPct) },
          { label: "Top category", value: "SQLi" },
        ],
      },
      {
        title: "Top attack sources",
        table: {
          header: ["Country", "Requests"],
          rows: [
            { label: "United States", value: intStr(blockedToday * 0.28) },
            { label: "Russia", value: intStr(blockedToday * 0.18) },
            { label: "China", value: intStr(blockedToday * 0.14) },
            { label: "Brazil", value: intStr(blockedToday * 0.09) },
          ],
        },
      },
    ],
  };
}

function hipsRecipe(t: Tool): ToolDashboardRecipe {
  const agents = t.observed;
  const expected = t.denominator;
  const rand = pseudoRand(`${t.id}-hips`);
  return {
    banner: "Deep Security — endpoint protection modules",
    widgets: [
      {
        title: "Agent fleet",
        subtitle: "Hosts reporting in the last hour",
        stats: [
          {
            label: "Reporting",
            value: `${intStr(agents)} / ${intStr(expected)}`,
            tone: agents / expected > 0.95 ? "ok" : "warn",
          },
          { label: "Latest version", value: "20.0.0-8438", tone: "ok" },
          { label: "Outdated > 2 versions", value: intStr(expected * 0.07), tone: "warn" },
        ],
      },
      {
        title: "Modules enabled",
        subtitle: "Coverage of the protection module set",
        bar: [
          { label: "Anti-Malware", pct: 0.99, color: "#22C55E" },
          { label: "IPS", pct: 0.92, color: "#22C55E" },
          { label: "Firewall", pct: 0.86, color: "#0095AF" },
          { label: "Integrity Mon.", pct: 0.74, color: "#D97706" },
          { label: "Log Inspection", pct: 0.58, color: "#D97706" },
        ],
      },
      {
        title: "IPS activity",
        stats: [
          { label: "Active rules", value: intStr(2400 + rand() * 80) },
          { label: "Blocked (24h)", value: intStr(620 + rand() * 200) },
          { label: "Last pattern update", value: "1h ago" },
        ],
      },
    ],
  };
}

function sftpRecipe(t: Tool): ToolDashboardRecipe {
  const users = t.observed;
  const expected = t.denominator;
  const rand = pseudoRand(`${t.id}-sftp`);
  const transfers = Math.floor(800 + rand() * 1200);
  const bytes = `${(0.7 + rand() * 2).toFixed(1)} GB`;
  return {
    banner: "Managed File Transfer — business activity",
    widgets: [
      {
        title: "Active users",
        stats: [
          {
            label: "Users",
            value: `${intStr(users)} / ${intStr(expected)}`,
            tone: users / expected > 0.95 ? "ok" : "warn",
          },
          { label: "Failed auth (24h)", value: intStr(rand() * 30), tone: "warn" },
        ],
      },
      {
        title: "Transfers today",
        stats: [
          { label: "Count", value: intStr(transfers) },
          { label: "Volume", value: bytes },
          { label: "Avg size", value: "1.4 MB" },
        ],
      },
      {
        title: "Top destinations",
        table: {
          header: ["Path", "Count"],
          rows: [
            { label: "/in/partner-A", value: intStr(transfers * 0.32) },
            { label: "/in/sftp-banker", value: intStr(transfers * 0.21) },
            { label: "/out/recon", value: intStr(transfers * 0.18) },
            { label: "/out/regulatory", value: intStr(transfers * 0.12) },
          ],
        },
      },
    ],
  };
}

function ddiRecipe(t: Tool): ToolDashboardRecipe {
  const rand = pseudoRand(`${t.id}-ddi`);
  const qps = Math.floor(1200 + rand() * 800);
  const dhcpUtil = 0.62 + rand() * 0.18;
  const ipamUtil = 0.74 + rand() * 0.12;
  return {
    banner: "DDI — DNS / DHCP / IPAM",
    widgets: [
      {
        title: "DNS query rate",
        stats: [
          { label: "Avg QPS", value: intStr(qps) },
          { label: "Peak QPS (24h)", value: intStr(qps * 2.1) },
          { label: "NXDOMAIN ratio", value: "1.4%", tone: "ok" },
        ],
      },
      {
        title: "DHCP utilization",
        bar: [
          { label: "Leased", pct: dhcpUtil, color: dhcpUtil > 0.85 ? "#D97706" : "#22C55E" },
          { label: "Free", pct: 1 - dhcpUtil, color: "#1F2937" },
        ],
        footnote: `Across ${t.denominator} branches. Watch for utilization > 85% on any single scope.`,
      },
      {
        title: "IPAM utilization",
        bar: [
          { label: "Allocated", pct: ipamUtil, color: ipamUtil > 0.85 ? "#D97706" : "#0095AF" },
          { label: "Available", pct: 1 - ipamUtil, color: "#1F2937" },
        ],
      },
    ],
  };
}

function diskEncRecipe(t: Tool): ToolDashboardRecipe {
  const enc = t.observed;
  const expected = t.denominator;
  const rand = pseudoRand(`${t.id}-disk`);
  const escrowed = enc * (0.96 + rand() * 0.03);
  return {
    banner: "Drive Encryption — data-at-rest",
    widgets: [
      {
        title: "Encrypted endpoints",
        subtitle: "Full-disk encryption status across the fleet",
        stats: [
          {
            label: "Encrypted",
            value: `${intStr(enc)} / ${intStr(expected)}`,
            tone: enc / expected > 0.95 ? "ok" : "warn",
          },
          { label: "Coverage", value: pctStr(enc / expected) },
        ],
      },
      {
        title: "Recovery key escrow",
        subtitle: "Keys safely stored in the central server",
        stats: [
          {
            label: "Escrowed",
            value: intStr(escrowed),
            tone: escrowed / enc > 0.98 ? "ok" : "warn",
          },
          { label: "Endpoints without escrow", value: intStr(enc - escrowed), tone: "warn" },
        ],
      },
      {
        title: "TPM",
        stats: [
          { label: "TPM 2.0 enabled", value: pctStr(0.94), tone: "ok" },
          { label: "TPM disabled / missing", value: pctStr(0.06), tone: "warn" },
        ],
      },
    ],
  };
}

function dlpRecipe(t: Tool): ToolDashboardRecipe {
  const eps = t.denominator;
  const rand = pseudoRand(`${t.id}-dlp`);
  const incidents24h = Math.floor(40 + rand() * 80);
  const blocked = Math.floor(incidents24h * (0.55 + rand() * 0.2));
  return {
    banner: "Data Loss Prevention — incidents & policies",
    widgets: [
      {
        title: "Last 24h incidents",
        stats: [
          { label: "Total incidents", value: intStr(incidents24h) },
          { label: "Blocked", value: intStr(blocked), tone: "ok" },
          { label: "Alert-only", value: intStr(incidents24h - blocked), tone: "warn" },
        ],
      },
      {
        title: "Top sensitive data sources",
        table: {
          header: ["Source", "Incidents"],
          rows: [
            { label: "USB / removable", value: intStr(incidents24h * 0.32) },
            { label: "Email outbound", value: intStr(incidents24h * 0.26) },
            { label: "Cloud upload", value: intStr(incidents24h * 0.21) },
            { label: "Printing", value: intStr(incidents24h * 0.12) },
          ],
        },
      },
      {
        title: "Block vs alert ratio",
        bar: [
          { label: "Block-mode", pct: blocked / Math.max(1, incidents24h), color: "#22C55E" },
          { label: "Alert-only", pct: 1 - blocked / Math.max(1, incidents24h), color: "#D97706" },
        ],
        footnote: `Across ${intStr(eps)} endpoints.`,
      },
    ],
  };
}

function edrRecipe(t: Tool): ToolDashboardRecipe {
  const agents = t.observed;
  const expected = t.denominator;
  const rand = pseudoRand(`${t.id}-edr`);
  const quarantines = Math.floor(40 + rand() * 60);
  const unmanaged = Math.floor((expected - agents) * 0.4);
  return {
    banner: "EDR — Singularity protection state",
    widgets: [
      {
        title: "Agent coverage",
        stats: [
          {
            label: "Active agents",
            value: `${intStr(agents)} / ${intStr(expected)}`,
            tone: agents / expected > 0.95 ? "ok" : "warn",
          },
          { label: "Unmanaged in domain (Ranger)", value: intStr(unmanaged), tone: "warn" },
          { label: "Coverage", value: pctStr(agents / expected) },
        ],
      },
      {
        title: "Quarantines this week",
        stats: [
          { label: "Files quarantined", value: intStr(quarantines), tone: "ok" },
          { label: "Auto-rolled back", value: intStr(Math.floor(quarantines * 0.78)), tone: "ok" },
          { label: "Manual investigation", value: intStr(Math.floor(quarantines * 0.12)) },
        ],
      },
      {
        title: "Agent version distribution",
        bar: [
          { label: "Latest", pct: 0.78, color: "#22C55E" },
          { label: "N-1", pct: 0.15, color: "#0095AF" },
          { label: "N-2", pct: 0.05, color: "#D97706" },
          { label: "Older", pct: 0.02, color: "#EF4444" },
        ],
      },
    ],
  };
}

function segmentRecipe(t: Tool): ToolDashboardRecipe {
  const seg = t.observed;
  const expected = t.denominator;
  const rand = pseudoRand(`${t.id}-seg`);
  const policies = Math.floor(140 + rand() * 80);
  const violations = Math.floor(rand() * 12);
  return {
    banner: "Micro-segmentation — east-west posture",
    widgets: [
      {
        title: "Segmented workloads",
        stats: [
          {
            label: "Segmented",
            value: `${intStr(seg)} / ${intStr(expected)}`,
            tone: seg / expected > 0.9 ? "ok" : "warn",
          },
          { label: "Labeled", value: pctStr(0.94), tone: "ok" },
        ],
      },
      {
        title: "Policies",
        stats: [
          { label: "Active", value: intStr(policies) },
          { label: "Recent changes (7d)", value: intStr(rand() * 18) },
          {
            label: "Violations (24h)",
            value: intStr(violations),
            tone: violations > 5 ? "warn" : "ok",
          },
        ],
      },
      {
        title: "Top east-west conversations",
        table: {
          header: ["Flow", "Sessions"],
          rows: [
            { label: "app-tier ↔ db-tier", value: intStr(rand() * 9000 + 2000) },
            { label: "web-tier ↔ app-tier", value: intStr(rand() * 8000 + 1500) },
            { label: "jump ↔ all", value: intStr(rand() * 3000 + 600) },
          ],
        },
      },
    ],
  };
}

function nacRecipe(t: Tool): ToolDashboardRecipe {
  const eps = t.observed;
  const expected = t.denominator;
  const rand = pseudoRand(`${t.id}-nac`);
  return {
    banner: "Network Access Control — device compliance",
    widgets: [
      {
        title: "Classified devices",
        stats: [
          {
            label: "Classified",
            value: `${intStr(eps)} / ${intStr(expected)}`,
            tone: eps / expected > 0.95 ? "ok" : "warn",
          },
          { label: "Unclassified", value: intStr(expected - eps), tone: "warn" },
        ],
      },
      {
        title: "Device type breakdown",
        bar: [
          { label: "Workstation", pct: 0.62, color: "#0095AF" },
          { label: "Mobile", pct: 0.18, color: "#22C55E" },
          { label: "IoT / OT", pct: 0.12, color: "#D97706" },
          { label: "Server", pct: 0.05, color: "#A855F7" },
          { label: "Unknown", pct: 0.03, color: "#EF4444" },
        ],
      },
      {
        title: "Posture",
        stats: [
          { label: "Compliant", value: pctStr(0.91), tone: "ok" },
          { label: "Quarantined", value: intStr(Math.floor(eps * 0.018)), tone: "warn" },
          { label: "Pending re-check", value: intStr(rand() * 80) },
        ],
      },
    ],
  };
}

// ─── Picker ──────────────────────────────────────────────────────────────

export function recipeForTool(tool: Tool): ToolDashboardRecipe {
  const solution = tool.solution.toLowerCase();
  const category = tool.category ?? "";

  if (solution.includes("mfa") || category === "identity-mfa") return mfaRecipe(tool);
  if (solution.includes("privilege") || category === "identity-pam") return pamRecipe(tool);
  if (solution.includes("waf") || category === "waf") return wafRecipe(tool);
  if (
    solution.includes("hips") ||
    solution.includes("deep security") ||
    category === "host-protection"
  ) {
    return hipsRecipe(tool);
  }
  if (solution.includes("sftp") || solution.includes("file") || category === "secure-transfer") {
    return sftpRecipe(tool);
  }
  if (solution.includes("ddi") || category === "network-services") return ddiRecipe(tool);
  if (solution.includes("disk") || solution.includes("encrypt") || category === "data-at-rest") {
    return diskEncRecipe(tool);
  }
  if (solution.includes("dlp") || solution.includes("loss prevention") || category === "dlp") {
    return dlpRecipe(tool);
  }
  if (solution.includes("edr") || category === "edr-hips") return edrRecipe(tool);
  if (
    solution.includes("segment") ||
    solution.includes("guardicore") ||
    category === "network-segmentation"
  ) {
    return segmentRecipe(tool);
  }
  if (solution.includes("access control") || category === "nac") return nacRecipe(tool);

  return {
    banner: `${tool.oem} — visibility`,
    widgets: [
      {
        title: "Coverage",
        stats: [
          {
            label: "Observed",
            value: `${intStr(tool.observed)} / ${intStr(tool.denominator)}`,
            tone: tool.observed / tool.denominator > 0.95 ? "ok" : "warn",
          },
        ],
      },
    ],
  };
}
