#!/usr/bin/env node
// One-shot health probe for the abcl-secviz dev server.
// Exit code 0 if healthy, 1 otherwise (suitable for systemd / cron / Nagios).

const frontendPort = Number(process.env.ABCL_SECVIZ_FRONTEND_PORT ?? 5174);
const timeoutMs = Number(process.env.ABCL_SECVIZ_HEALTH_TIMEOUT_MS ?? 5000);

const url = process.env.ABCL_SECVIZ_FRONTEND_HEALTH_URL ?? `http://127.0.0.1:${frontendPort}/`;

let ok = false;
let detail = "";
let status = null;
try {
  const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  status = r.status;
  ok = r.status < 500;
  detail = `HTTP ${r.status}`;
} catch (e) {
  ok = false;
  detail = e.message;
}

console.log(
  JSON.stringify(
    {
      time: new Date().toISOString(),
      tool: "abcl-secviz-healthcheck",
      ok,
      url,
      status,
      detail,
    },
    null,
    2,
  ),
);

process.exit(ok ? 0 : 1);
