/**
 * Per-OEM webhook integration recipes.
 *
 * Each recipe describes how an admin should wire the OEM's outgoing webhook
 * to Day2 SecOps. The frontend renders these as copy-paste blocks on
 * /admin/integrations.
 */

export interface IntegrationRecipe {
  oem: string;
  toolId: string;
  /** Where in the vendor's console the admin sets the webhook. */
  vendorPath: string;
  /** Headers the vendor must send. */
  requiredHeaders: { name: string; value: string }[];
  /** Sample curl invocation an admin can run from the vendor side. */
  curl: string;
  /** Free-form notes — auth schemes, version constraints, etc. */
  notes: string[];
}

const PAYLOAD_EXAMPLE = `{"observed": 50100, "lastSync": "2026-05-23T12:34:56Z", "causes": [], "note": null}`;

function makeCurl(toolId: string, base = "https://day2-secops.your.internal"): string {
  return `# 1. Server gives you a per-tool secret. Sign the body and POST it.
SECRET="$(cat /etc/day2-secops/${toolId}.secret)"
BODY='${PAYLOAD_EXAMPLE}'
SIG="sha256=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -r | cut -d' ' -f1)"
curl -sS -X POST ${base}/api/webhooks/${toolId} \\
  -H "Content-Type: application/json" \\
  -H "X-Day2-Signature: $SIG" \\
  --data "$BODY"`;
}

export const RECIPES: IntegrationRecipe[] = [
  {
    oem: "CyberArk",
    toolId: "mfa",
    vendorPath: "Identity Admin Console → Settings → Webhooks → New",
    requiredHeaders: [
      { name: "Content-Type", value: "application/json" },
      { name: "X-Day2-Signature", value: "sha256=<hex>" },
    ],
    curl: makeCurl("mfa"),
    notes: [
      "Use the Identity Security Cloud webhook builder; emit `MFA_ENROLLMENT_DELTA` events.",
      "Map CyberArk's `enrolledUsers` to Day2 SecOps `observed`.",
    ],
  },
  {
    oem: "CyberArk",
    toolId: "pam",
    vendorPath: "PAS Web Portal → Administration → Webhooks",
    requiredHeaders: [
      { name: "Content-Type", value: "application/json" },
      { name: "X-Day2-Signature", value: "sha256=<hex>" },
    ],
    curl: makeCurl("pam"),
    notes: [
      "Subscribe to `ACCOUNT_VAULT_CHANGE` + `SESSION_RECORDING_COMPLETE` events.",
      "Map total vaulted-account count to `observed`.",
    ],
  },
  {
    oem: "Indusface AppTrana",
    toolId: "appTrana",
    vendorPath: "AppTrana Console → Account → Webhooks",
    requiredHeaders: [
      { name: "Content-Type", value: "application/json" },
      { name: "X-Day2-Signature", value: "sha256=<hex>" },
    ],
    curl: makeCurl("appTrana"),
    notes: [
      "Emit a daily summary webhook from the AppTrana Reports → Schedule menu.",
      "Map `protectedFqdns` → `observed`, `totalFqdns` → denominator (compare with seed).",
    ],
  },
  {
    oem: "Imperva WAF",
    toolId: "impervaWaf",
    vendorPath: "Imperva Management Console → Setup → Connectors",
    requiredHeaders: [
      { name: "Content-Type", value: "application/json" },
      { name: "X-Day2-Signature", value: "sha256=<hex>" },
    ],
    curl: makeCurl("impervaWaf"),
    notes: [
      "Use the Cloud Connector outbound webhook; on-prem Imperva needs a connector VM.",
    ],
  },
  {
    oem: "TrendMicro",
    toolId: "trendHips",
    vendorPath: "Deep Security Manager → Administration → System Settings → SIEM",
    requiredHeaders: [{ name: "Content-Type", value: "application/json" }],
    curl: makeCurl("trendHips"),
    notes: [
      "Deep Security exports via Common Event Format (CEF) — use the Day2 SecOps CEF→JSON adapter.",
    ],
  },
  {
    oem: "GlobalScape",
    toolId: "sftp",
    vendorPath: "EFT Administration Interface → Server → Event Rules",
    requiredHeaders: [{ name: "Content-Type", value: "application/json" }],
    curl: makeCurl("sftp"),
    notes: [
      "Create an Event Rule that fires on connection events; use the Custom Command action to POST JSON.",
    ],
  },
  {
    oem: "TCPWAVE",
    toolId: "ddi",
    vendorPath: "TCPWAVE Console → API → Webhook Subscriptions",
    requiredHeaders: [{ name: "Content-Type", value: "application/json" }],
    curl: makeCurl("ddi"),
    notes: [
      "Subscribe to `DHCP_SCOPE_UTILIZATION` and `DNS_HEALTH_DIGEST`.",
    ],
  },
  {
    oem: "Trellix",
    toolId: "trellix",
    vendorPath: "ePO → Server Settings → Outbound Notifications",
    requiredHeaders: [{ name: "Content-Type", value: "application/json" }],
    curl: makeCurl("trellix"),
    notes: [
      "Trellix sends MEF (McAfee Event Format) — adapter required.",
      "Surface `EncryptedClients` + `EscrowedKeys` counts.",
    ],
  },
  {
    oem: "Forcepoint",
    toolId: "forcepoint",
    vendorPath: "Forcepoint Security Manager → Settings → Reporting → Webhook",
    requiredHeaders: [{ name: "Content-Type", value: "application/json" }],
    curl: makeCurl("forcepoint"),
    notes: [
      "Use Reporting → DLP Incidents Export with the JSON output format.",
    ],
  },
  {
    oem: "SentinelOne",
    toolId: "sentinelOne",
    vendorPath: "Singularity → Settings → API Tokens → Webhooks",
    requiredHeaders: [{ name: "Content-Type", value: "application/json" }],
    curl: makeCurl("sentinelOne"),
    notes: [
      "Subscribe to `AGENT_INVENTORY_DELTA` + `RANGER_DISCOVERY` to get unmanaged-host counts.",
    ],
  },
  {
    oem: "Guardicore",
    toolId: "guardicore",
    vendorPath: "Centra → System → Integrations → Webhooks",
    requiredHeaders: [{ name: "Content-Type", value: "application/json" }],
    curl: makeCurl("guardicore"),
    notes: [
      "Now part of Akamai — modern installs use the Akamai Guardicore Segmentation API.",
    ],
  },
  {
    oem: "Forescout",
    toolId: "forescout",
    vendorPath: "Forescout Console → Tools → Web API → Outbound Triggers",
    requiredHeaders: [{ name: "Content-Type", value: "application/json" }],
    curl: makeCurl("forescout"),
    notes: [
      "Trigger on Device Compliance State Change. Forescout sends raw JSON if you uncheck the legacy XML mode.",
    ],
  },
];

export function recipeByToolId(toolId: string): IntegrationRecipe | undefined {
  return RECIPES.find((r) => r.toolId === toolId);
}
