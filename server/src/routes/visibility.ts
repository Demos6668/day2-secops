import { Router } from "express";
import { db } from "../db/index.js";

export const visibilityRouter = Router();

interface ToolRow {
  id: string;
  seed_json: string;
  webhook_enabled: number;
}
interface VisRow {
  tool_id: string;
  observed: number;
  last_sync: string;
  causes_json: string;
  status: string;
  score: number;
}

visibilityRouter.get("/", (_req, res) => {
  const tools = db
    .prepare("SELECT id, seed_json, webhook_enabled FROM tools")
    .all() as ToolRow[];
  const stateRows = db
    .prepare(
      "SELECT tool_id, observed, last_sync, causes_json, status, score FROM visibility_state",
    )
    .all() as VisRow[];
  const stateByTool = new Map(stateRows.map((r) => [r.tool_id, r]));

  const out = tools.map((row) => {
    const seed = JSON.parse(row.seed_json);
    const state = stateByTool.get(row.id);
    return {
      ...seed,
      observed: state?.observed ?? 0,
      lastSync: state?.last_sync ?? null,
      causes: state ? JSON.parse(state.causes_json) : [],
      status: state?.status ?? "red",
      score: state?.score ?? 0,
      webhookEnabled: row.webhook_enabled === 1,
    };
  });

  res.json({ tools: out, at: Date.now() });
});

visibilityRouter.get("/:toolId", (req, res) => {
  const id = req.params.toolId;
  const row = db
    .prepare("SELECT id, seed_json, webhook_enabled FROM tools WHERE id = ?")
    .get(id) as ToolRow | undefined;
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const state = db
    .prepare(
      "SELECT observed, last_sync, causes_json, status, score FROM visibility_state WHERE tool_id = ?",
    )
    .get(id) as Omit<VisRow, "tool_id"> | undefined;
  const events = db
    .prepare(
      "SELECT id, at, kind, payload_json, source FROM events WHERE tool_id = ? ORDER BY at DESC LIMIT 50",
    )
    .all(id) as Array<{
    id: string;
    at: number;
    kind: string;
    payload_json: string;
    source: string;
  }>;
  res.json({
    tool: {
      ...JSON.parse(row.seed_json),
      observed: state?.observed ?? 0,
      lastSync: state?.last_sync ?? null,
      causes: state ? JSON.parse(state.causes_json) : [],
      status: state?.status ?? "red",
      score: state?.score ?? 0,
      webhookEnabled: row.webhook_enabled === 1,
    },
    events: events.map((e) => ({
      id: e.id,
      at: e.at,
      kind: e.kind,
      payload: JSON.parse(e.payload_json),
      source: e.source,
    })),
  });
});
