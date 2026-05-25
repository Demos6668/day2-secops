import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "../db/index.js";
import { verifySignature } from "../lib/hmac.js";
import { broadcast } from "../ws.js";
import { recordFailure, recordSuccess, shouldAllow } from "../lib/circuit.js";
import {
  scoreVisibility,
  type Severity,
  type VisibilityCauseFlag,
} from "../lib/score.js";

export const webhooksRouter = Router();

const WebhookPayloadSchema = z.object({
  observed: z.number().int().nonnegative(),
  lastSync: z.string().min(1),
  causes: z
    .array(
      z.enum([
        "agent_absent",
        "agent_silent",
        "coverage_gap",
        "policy_drift",
        "telemetry_blocked",
        "stale_data",
        "eol_unsupported",
        "decommission_ghost",
      ]),
    )
    .default([]),
  note: z.string().max(500).nullable().optional(),
});

interface ToolRow {
  id: string;
  workspace_id: string;
  seed_json: string;
  webhook_secret: string | null;
  webhook_enabled: number;
}

function newEventId(): string {
  return "evt_" + randomBytes(8).toString("hex");
}

webhooksRouter.post("/:toolId", (req, res) => {
  const toolId = req.params.toolId;
  if (!shouldAllow(toolId)) {
    res.status(503).json({ error: "circuit_open" });
    return;
  }

  const row = db
    .prepare(
      "SELECT id, workspace_id, seed_json, webhook_secret, webhook_enabled FROM tools WHERE id = ?",
    )
    .get(toolId) as ToolRow | undefined;
  if (!row) {
    recordFailure(toolId);
    res.status(404).json({ error: "unknown_tool" });
    return;
  }
  if (row.webhook_enabled !== 1 || !row.webhook_secret) {
    recordFailure(toolId);
    res.status(403).json({ error: "webhook_disabled" });
    return;
  }

  const sig = req.header("x-day2-signature");
  // req.rawBody is populated by the raw-body middleware in index.ts.
  const raw = (req as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.from("");
  if (!verifySignature(raw, sig, row.webhook_secret)) {
    recordFailure(toolId);
    res.status(401).json({ error: "bad_signature" });
    return;
  }

  const parsed = WebhookPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    recordFailure(toolId);
    res.status(400).json({ error: "invalid_payload", issues: parsed.error.issues });
    return;
  }

  const seed = JSON.parse(row.seed_json) as {
    severity: Severity;
    denominator: number;
  };

  const { observed, lastSync, causes } = parsed.data;
  const score = scoreVisibility({
    severity: seed.severity,
    observed,
    denominator: seed.denominator,
    causes: causes as VisibilityCauseFlag[],
  });

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO visibility_state (tool_id, observed, last_sync, causes_json, status, score, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(tool_id) DO UPDATE SET
         observed = excluded.observed,
         last_sync = excluded.last_sync,
         causes_json = excluded.causes_json,
         status = excluded.status,
         score = excluded.score,
         updated_at = datetime('now')`,
    ).run(toolId, observed, lastSync, JSON.stringify(causes), score.status, score.score);

    db.prepare(
      `INSERT INTO events (id, tool_id, workspace_id, at, kind, payload_json, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      newEventId(),
      toolId,
      row.workspace_id,
      Date.now(),
      "visibility_update",
      JSON.stringify(parsed.data),
      "webhook",
    );
  });
  tx();
  recordSuccess(toolId);

  broadcast({
    type: "visibility_update",
    toolId,
    payload: { observed, lastSync, causes, status: score.status, score: score.score },
  });

  res.json({ ok: true, status: score.status, score: score.score });
});
