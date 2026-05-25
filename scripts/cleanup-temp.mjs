#!/usr/bin/env node
// Standalone temp/cache cleanup for abcl-secviz.
//
// Safe to run repeatedly. Removes:
//   - node_modules/.vite older than 7 days
//   - node_modules/.vitest older than 7 days
//   - /tmp/abcl-secviz-* older than ABCL_SECVIZ_TEMP_MAX_AGE_HOURS (24h default)
//   - var/log/*.log.N rotated copies older than 14 days
//
// Invoked from systemd timer or supervisor SIGHUP.

import { readdir, stat, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(__filename), "..");

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const tempMaxAgeMs =
  Number(process.env.ABCL_SECVIZ_TEMP_MAX_AGE_HOURS ?? "") > 0
    ? Number(process.env.ABCL_SECVIZ_TEMP_MAX_AGE_HOURS) * HOUR_MS
    : 24 * HOUR_MS;

const logDir = process.env.ABCL_SECVIZ_LOG_DIR ?? join(repoRoot, "var", "log");

const targets = [
  { dir: join(repoRoot, "node_modules", ".vite"), olderThanMs: 7 * DAY_MS },
  { dir: join(repoRoot, "node_modules", ".vitest"), olderThanMs: 7 * DAY_MS },
  { dir: "/tmp", prefix: "abcl-secviz-", olderThanMs: tempMaxAgeMs },
  { dir: logDir, namePattern: /\.\d+$/, olderThanMs: 14 * DAY_MS },
];

async function clean(t) {
  let entries;
  try {
    entries = await readdir(t.dir);
  } catch (e) {
    if (e.code === "ENOENT") return { removed: 0, bytes: 0, errors: 0 };
    return { removed: 0, bytes: 0, errors: 1 };
  }
  let removed = 0;
  let bytes = 0;
  let errors = 0;
  for (const name of entries) {
    if (t.prefix && !name.startsWith(t.prefix)) continue;
    if (t.namePattern && !t.namePattern.test(name)) continue;
    const full = join(t.dir, name);
    try {
      const s = await stat(full);
      if (Date.now() - s.mtimeMs < t.olderThanMs) continue;
      const size = s.isDirectory() ? 0 : s.size;
      await rm(full, { recursive: true, force: true });
      removed += 1;
      bytes += size;
    } catch {
      errors += 1;
    }
  }
  return { removed, bytes, errors };
}

const results = [];
for (const t of targets) {
  const r = await clean(t);
  results.push({ target: t.dir, ...r });
}

const summary = results.reduce(
  (acc, r) => ({
    removed: acc.removed + r.removed,
    bytes: acc.bytes + r.bytes,
    errors: acc.errors + r.errors,
  }),
  { removed: 0, bytes: 0, errors: 0 },
);

console.log(
  JSON.stringify(
    { time: new Date().toISOString(), tool: "abcl-secviz-cleanup-temp", summary, details: results },
    null,
    2,
  ),
);

process.exit(summary.errors > 0 ? 1 : 0);
