/**
 * ServerSource — reads canonical state from the Day2 SecOps API.
 *
 * Mock stays the default by design. This source activates only when the
 * operator explicitly opts in (Settings switch + ?live=1 URL flag).
 *
 * Two modes work together:
 *   - On boot: GET /api/visibility for the snapshot
 *   - Live:    WS /api/events → push updates straight into our Tool[] state
 *
 * The FeederProvider drives the polling cadence; the WebSocket just signals
 * that the source has fresh data and `fetch()` should pull it.
 */

import type { Tool, ToolSeed, VisibilityCauseFlag } from "@/types/tool";
import type { VisibilitySource, VisibilityUpdate } from "./VisibilitySource";

interface ServerToolSnapshot {
  id: string;
  observed: number;
  lastSync: string;
  causes: VisibilityCauseFlag[];
  status?: string;
  score?: number;
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

export class ServerSource implements VisibilitySource {
  name = "server";
  private base: string;
  private ws: WebSocket | null = null;
  private pending = new Map<string, ServerToolSnapshot>();
  private wsBackoff = 1000;

  constructor(opts?: { apiBase?: string }) {
    this.base = opts?.apiBase ?? API_BASE;
    this.connectWs();
  }

  owns(_seed: ToolSeed): boolean {
    return true;
  }

  async fetch(seeds: ToolSeed[], _prior: ReadonlyMap<string, Tool>): Promise<VisibilityUpdate[]> {
    // Pull canonical state. Cheap (the server returns plain JSON, one row per tool).
    try {
      const r = await fetch(`${this.base}/visibility`, {
        credentials: "include",
        signal: AbortSignal.timeout(5_000),
      });
      if (!r.ok) {
        console.warn(`[ServerSource] GET /visibility → HTTP ${r.status}`);
        return [];
      }
      const body = (await r.json()) as { tools: ServerToolSnapshot[] };
      const ownedIds = new Set(seeds.map((s) => s.id));
      const out: VisibilityUpdate[] = [];
      for (const t of body.tools) {
        if (!ownedIds.has(t.id)) continue;
        out.push({
          toolId: t.id,
          observed: t.observed,
          lastSync: t.lastSync,
          causes: t.causes,
        });
      }
      // Drain WS-pushed updates we already saw; the snapshot above is fresher.
      this.pending.clear();
      return out;
    } catch (err) {
      console.warn("[ServerSource] fetch failed:", err);
      return [];
    }
  }

  private connectWs(): void {
    if (typeof window === "undefined") return;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    // The API_BASE is same-origin (/api), so derive host from location.
    const url = `${protocol}://${window.location.host}${this.base}/events`;
    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.wsBackoff = 1000;
    };
    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as {
          type: string;
          toolId?: string;
          payload?: Partial<ServerToolSnapshot>;
        };
        if (msg.type === "visibility_update" && msg.toolId && msg.payload) {
          this.pending.set(msg.toolId, {
            id: msg.toolId,
            observed: msg.payload.observed ?? 0,
            lastSync: msg.payload.lastSync ?? new Date().toISOString(),
            causes: msg.payload.causes ?? [],
          });
        }
      } catch {
        // ignore malformed messages
      }
    };
    this.ws.onclose = () => {
      this.ws = null;
      this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      // onclose fires next; let it handle reconnect.
    };
  }

  private scheduleReconnect(): void {
    setTimeout(() => this.connectWs(), this.wsBackoff);
    this.wsBackoff = Math.min(this.wsBackoff * 2, 30_000);
  }

  dispose(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }
}
