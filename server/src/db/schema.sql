-- Day2 SecOps SQLite schema.
-- v1 — single-tenant, ops-managed. Replace `users.role` with real RBAC for v2.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  username    TEXT NOT NULL UNIQUE,
  pw_hash     TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'admin',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  config_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tools (
  id             TEXT PRIMARY KEY,
  workspace_id   TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  seed_json      TEXT NOT NULL,
  webhook_secret TEXT,
  webhook_enabled INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tools_workspace ON tools(workspace_id);

CREATE TABLE IF NOT EXISTS visibility_state (
  tool_id    TEXT PRIMARY KEY REFERENCES tools(id) ON DELETE CASCADE,
  observed   INTEGER NOT NULL,
  last_sync  TEXT NOT NULL,
  causes_json TEXT NOT NULL DEFAULT '[]',
  status     TEXT NOT NULL,
  score      REAL NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  tool_id     TEXT REFERENCES tools(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  at          INTEGER NOT NULL,
  kind        TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'webhook'
);
CREATE INDEX IF NOT EXISTS idx_events_workspace_at ON events(workspace_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_events_tool_at ON events(tool_id, at DESC);

CREATE TABLE IF NOT EXISTS snapshots (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  taken_at     TEXT NOT NULL,
  trigger      TEXT NOT NULL,
  source       TEXT,
  label        TEXT,
  tools_json   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshots_workspace_at ON snapshots(workspace_id, taken_at DESC);
