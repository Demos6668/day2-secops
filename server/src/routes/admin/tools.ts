import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "../../db/index.js";
import { requireAdmin } from "../../lib/auth.js";
import { snapshot as circuitSnapshot } from "../../lib/circuit.js";

export const adminToolsRouter = Router();
adminToolsRouter.use(requireAdmin);

const ToolUpdateSchema = z.object({
  denominator: z.number().int().positive().optional(),
  severity: z.enum(["Critical", "Moderate", "Low"]).optional(),
  freshnessSloHoursOverride: z.number().positive().nullable().optional(),
  mockProfile: z.enum(["healthy", "degraded", "flapping", "stale"]).optional(),
  webhookEnabled: z.boolean().optional(),
});

interface ToolRow {
  id: string;
  workspace_id: string;
  seed_json: string;
  webhook_secret: string | null;
  webhook_enabled: number;
}

adminToolsRouter.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT id, workspace_id, seed_json, webhook_secret, webhook_enabled FROM tools")
    .all() as ToolRow[];
  res.json({
    tools: rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      seed: JSON.parse(r.seed_json),
      webhookEnabled: r.webhook_enabled === 1,
      hasSecret: r.webhook_secret !== null,
    })),
    circuits: circuitSnapshot(),
  });
});

adminToolsRouter.patch("/:toolId", (req, res) => {
  const id = req.params.toolId;
  const body = ToolUpdateSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid_body", issues: body.error.issues });
    return;
  }
  const row = db.prepare("SELECT seed_json FROM tools WHERE id = ?").get(id) as
    | { seed_json: string }
    | undefined;
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const seed = JSON.parse(row.seed_json) as Record<string, unknown>;
  for (const [k, v] of Object.entries(body.data)) {
    if (v === undefined || k === "webhookEnabled") continue;
    seed[k] = v;
  }
  db.prepare(
    "UPDATE tools SET seed_json = ?, webhook_enabled = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(
    JSON.stringify(seed),
    body.data.webhookEnabled === undefined
      ? row.seed_json === undefined
        ? 0
        : 0
      : body.data.webhookEnabled
        ? 1
        : 0,
    id,
  );
  res.json({ ok: true });
});

adminToolsRouter.post("/:toolId/rotate-secret", (req, res) => {
  const id = req.params.toolId;
  const secret = randomBytes(32).toString("hex");
  const r = db
    .prepare("UPDATE tools SET webhook_secret = ?, webhook_enabled = 1 WHERE id = ?")
    .run(secret, id);
  if (r.changes === 0) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ ok: true, secret });
});

adminToolsRouter.post("/:toolId/test-fire", (req, res) => {
  // No actual delivery — admin can use the curl recipe instead. This endpoint
  // is a stub for v2 once we add a "synthetic event" path through the receiver.
  res.json({ ok: true, message: "Stub. Use the curl recipe on /admin/integrations." });
});
