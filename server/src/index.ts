/**
 * Day2 SecOps API server.
 *
 * Endpoints:
 *   GET  /api/healthz                — supervisor liveness
 *   GET  /api/visibility             — current tool state (read-only)
 *   GET  /api/visibility/:toolId     — single tool + recent events
 *   POST /api/webhooks/:toolId       — OEM-side webhook receiver (HMAC verified)
 *   POST /api/admin/login            — username/password → cookie session
 *   POST /api/admin/logout
 *   GET  /api/admin/me
 *   GET  /api/admin/tools            — admin tool list + circuit status
 *   PATCH /api/admin/tools/:toolId
 *   POST /api/admin/tools/:toolId/rotate-secret
 *   GET  /api/admin/integrations     — OEM recipes for /admin/integrations
 *   WS   /api/events                 — fan-out for visibility_update + snapshot
 */

import express, { json, type Request } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "node:http";
import { db, pruneExpiredSessions } from "./db/index.js";
import { seedAdminIfMissing } from "./lib/auth.js";
import { visibilityRouter } from "./routes/visibility.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { adminAuthRouter } from "./routes/admin/auth.js";
import { adminToolsRouter } from "./routes/admin/tools.js";
import { adminIntegrationsRouter } from "./routes/admin/integrations.js";
import { attachWebSocket } from "./ws.js";

const PORT = Number(process.env.PORT ?? process.env.DAY2_SECOPS_API_PORT ?? 8082);
const FRONTEND_ORIGIN = process.env.DAY2_SECOPS_FRONTEND_ORIGIN ?? "http://localhost:5174";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false, // CSP is served by the frontend's index.html.
  }),
);
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser());

// Raw-body capture so /api/webhooks can HMAC-verify the exact bytes the OEM signed.
app.use(
  json({
    limit: "200kb",
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    },
  }),
);

// Per-IP rate limiter, generous — real abuse handling at the LB.
const limiter = rateLimit({
  windowMs: 60_000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// Routes
app.get("/api/healthz", (_req, res) => {
  res.json({ ok: true, at: Date.now() });
});
app.use("/api/visibility", visibilityRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/admin", adminAuthRouter);
app.use("/api/admin/tools", adminToolsRouter);
app.use("/api/admin/integrations", adminIntegrationsRouter);

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(404).end();
});

// Boot
seedAdminIfMissing();
pruneExpiredSessions();
setInterval(() => pruneExpiredSessions(), 60 * 60_000);

const server = createServer(app);
attachWebSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      time: new Date().toISOString(),
      level: "info",
      service: "day2-secops-api",
      event: "listening",
      port: PORT,
      db: "sqlite",
    }),
  );
});

process.on("SIGTERM", () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
process.on("SIGINT", () => process.kill(process.pid, "SIGTERM"));
