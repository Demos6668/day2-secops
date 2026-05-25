import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH =
  process.env.DAY2_SECOPS_DB_PATH ??
  resolve(__dirname, "..", "..", "..", "var", "db", "day2-secops.db");

export function openDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const schema = readFileSync(resolve(__dirname, "schema.sql"), "utf8");
  db.exec(schema);
  return db;
}

export const db = openDb();

/** Drop all sessions whose expires_at has passed. Called on startup + hourly. */
export function pruneExpiredSessions(): number {
  const r = db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
  return r.changes;
}

export interface UserRow {
  id: string;
  username: string;
  pw_hash: string;
  role: string;
  created_at: string;
}
