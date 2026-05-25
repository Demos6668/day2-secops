/**
 * WebhookSource — placeholder for real OEM integrations.
 *
 * SECURITY NOTICE (SEC C-1): the real receiver MUST run on a server, not the
 * browser. Any HMAC secret embedded into a Vite-prefixed env var would be
 * inlined into the public bundle at build time, defeating the signing scheme.
 *
 * The intended deployment topology is:
 *
 *   OEM webhook  ──►  Day2 SecOps API service  ──►  Day2 SecOps frontend
 *                    (server-side HMAC verify,        (read-only via /api)
 *                     timeout, circuit breaker)
 *
 * The frontend WebhookSource shown here is therefore only a *client* of the
 * Day2 SecOps API — it polls / subscribes to a same-origin endpoint that the
 * server already authenticated. It never sees the OEM secret.
 *
 * Environment variables consumed (frontend-side, safe to inline):
 *   VITE_API_BASE                 — base path for the Day2 SecOps API (eg. "/api")
 *
 * Environment variables on the SERVER side (NEVER prefixed VITE_*):
 *   WEBHOOK_URL_<TOOL_ID>         — receiver endpoint registered with the OEM
 *   WEBHOOK_SECRET_<TOOL_ID>      — HMAC secret used to verify the OEM payload
 *
 * Expected upstream payload (verified server-side):
 *   {
 *     "observed":  number,
 *     "lastSync":  string,
 *     "causes":    VisibilityCauseFlag[],
 *     "note":      string | null
 *   }
 *
 * TODO(phase-real): implement the GET against `${apiBase}/visibility?since=...`
 * with AbortSignal.timeout, exponential-backoff retry, and a per-tool circuit
 * breaker. URL allowlist (SEC H-2) is enforced on the SERVER, not here.
 */

import type { Tool, ToolSeed } from "@/types/tool";
import type { VisibilitySource, VisibilityUpdate } from "./VisibilitySource";

export interface WebhookSourceOptions {
  /** Predicate to decide which tool ids this source owns. */
  ownsToolId: (toolId: string) => boolean;
  /** Same-origin Day2 SecOps API base. NEVER a remote OEM URL. */
  apiBase?: string;
}

const DEFAULT_API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

export class WebhookSource implements VisibilitySource {
  name = "webhook";
  private opts: WebhookSourceOptions;

  constructor(opts: WebhookSourceOptions) {
    this.opts = { apiBase: DEFAULT_API_BASE, ...opts };
  }

  owns(seed: ToolSeed): boolean {
    return this.opts.ownsToolId(seed.id);
  }

  async fetch(
    _seeds: ToolSeed[],
    _priorState: ReadonlyMap<string, Tool>,
  ): Promise<VisibilityUpdate[]> {
    // TODO(phase-real):
    //   const r = await fetch(`${this.opts.apiBase}/visibility?since=...`, {
    //     signal: AbortSignal.timeout(8_000),
    //   });
    //   const updates = VisibilityUpdateArraySchema.parse(await r.json());
    //   return updates;
    return [];
  }
}
