#!/usr/bin/env node
// abcl-secviz stack supervisor.
//
// Multi-child supervisor for the Vite frontend, the SecOps API, and
// (optionally) the Day2 OSINT origin. Keeps each child alive with:
//   - Exponential backoff restart on exit
//   - HTTP health-check loop with kill-after-N-failures
//   - Per-child process group so children don't leak across restarts
//   - Periodic temp cleanup (vite cache, /tmp/abcl-secviz-*, rotated logs)
//   - SIGINT/SIGTERM graceful shutdown
//   - Rotating supervisor.log + per-child .log
//
// Stability guards (new):
//   - RSS overrun: child > MAX_RSS_MB sustained → restart
//   - CPU overrun: child > MAX_CPU_PCT sustained → restart
//   - Loadavg pressure: skip non-essential restarts when 1m/nproc > LOAD_PRESSURE
//   - Disk pressure: stop file logging when var/log filesystem has < MIN_FREE_MB
//   - Proc-count guard: too many `node` PIDs → force cleanup of orphan workers
//   - Circuit breaker: > MAX_RESTARTS_WINDOW within RESTARTS_WINDOW_MS → quarantine
//
// Configurable via env vars (sensible defaults if unset):
//   ABCL_SECVIZ_FRONTEND_PORT       (default 5174)
//   ABCL_SECVIZ_FRONTEND_HEALTH_URL (default http://127.0.0.1:${PORT}/)
//   ABCL_SECVIZ_API_PORT            (default 8082)
//   ABCL_SECVIZ_API_HEALTH_URL      (default http://127.0.0.1:${PORT}/api/healthz)
//   ABCL_SECVIZ_DISABLE_API         "1" to skip the API child
//   ABCL_SECVIZ_OSINT_CWD           absolute path to OSINT app (if unset → OSINT disabled)
//   ABCL_SECVIZ_OSINT_PORT          (default 5173)
//   ABCL_SECVIZ_OSINT_HEALTH_URL    (default http://127.0.0.1:${PORT}/)
//   ABCL_SECVIZ_HEALTH_INTERVAL_MS  (default 30000)
//   ABCL_SECVIZ_HEALTH_TIMEOUT_MS   (default 10000)
//   ABCL_SECVIZ_HEALTH_FAIL_THRESHOLD (default 5)
//   ABCL_SECVIZ_RESTART_DELAY_MS    (default 2000)
//   ABCL_SECVIZ_MAX_RESTART_DELAY_MS (default 60000)
//   ABCL_SECVIZ_FORCE_KILL_GRACE_MS (default 10000)
//   ABCL_SECVIZ_STARTUP_GRACE_MS    (default 30000)
//   ABCL_SECVIZ_CLEANUP_INTERVAL_MS (default 600000 = 10 min)
//   ABCL_SECVIZ_LOG_DIR             (default ${repo}/var/log)
//   ABCL_SECVIZ_LOG_MAX_BYTES       (default 10485760 = 10 MiB)
//   ABCL_SECVIZ_LOG_MAX_FILES       (default 5)
//   ABCL_SECVIZ_FRONTEND_MODE       "dev" (default) or "preview"
//   ABCL_SECVIZ_STABILITY_INTERVAL_MS (default 30000)
//   ABCL_SECVIZ_MAX_RSS_MB          per-child RSS ceiling (default 1500)
//   ABCL_SECVIZ_MAX_CPU_PCT         per-child CPU% ceiling (default 90)
//   ABCL_SECVIZ_STABILITY_STRIKES   consecutive samples to trip (default 4 ≈ 2 min)
//   ABCL_SECVIZ_LOAD_PRESSURE       loadavg/nproc threshold (default 4.0)
//   ABCL_SECVIZ_MIN_FREE_MB         disk-pressure threshold (default 500)
//   ABCL_SECVIZ_MAX_NODE_PROCS      orphan-detector trigger (default 30)
//   ABCL_SECVIZ_BREAKER_RESTARTS    circuit-breaker count (default 10)
//   ABCL_SECVIZ_BREAKER_WINDOW_MS   circuit-breaker window (default 300000 = 5 min)
//   PNPM_BIN                        absolute path to pnpm (auto-detected)

import { spawn, execSync } from "node:child_process";
import net from "node:net";

function tcpProbe(host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const s = new net.Socket();
    let done = false;
    const finish = (err) => {
      if (done) return;
      done = true;
      try { s.destroy(); } catch {}
      err ? reject(err) : resolve();
    };
    s.setTimeout(timeoutMs, () => finish(new Error("tcp probe timeout")));
    s.once("error", finish);
    s.once("connect", () => finish());
    s.connect(port, host);
  });
}
import {
  mkdirSync,
  statSync,
  renameSync,
  existsSync,
  openSync,
  closeSync,
  writeSync,
  readFileSync,
  rmSync as fsRmSync,
  unlinkSync,
} from "node:fs";
import { readdir, stat as statAsync, rm, statfs } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadavg, cpus } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(__filename), "..");

function numEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const cfg = {
  frontendPort: numEnv("ABCL_SECVIZ_FRONTEND_PORT", 5174),
  apiPort: numEnv("ABCL_SECVIZ_API_PORT", 8082),
  disableApi: process.env.ABCL_SECVIZ_DISABLE_API === "1",
  osintCwd: process.env.ABCL_SECVIZ_OSINT_CWD ?? "",
  osintPort: numEnv("ABCL_SECVIZ_OSINT_PORT", 5173),
  pgBin: process.env.ABCL_SECVIZ_PG_BIN ?? "",
  pgData: process.env.ABCL_SECVIZ_PG_DATA ?? "",
  pgRunDir: process.env.ABCL_SECVIZ_PG_RUN_DIR ?? "",
  pgPort: numEnv("ABCL_SECVIZ_PG_PORT", 5432),
  pgHost: process.env.ABCL_SECVIZ_PG_HOST ?? "127.0.0.1",
  healthIntervalMs: numEnv("ABCL_SECVIZ_HEALTH_INTERVAL_MS", 30_000),
  healthTimeoutMs: numEnv("ABCL_SECVIZ_HEALTH_TIMEOUT_MS", 10_000),
  healthFailThreshold: numEnv("ABCL_SECVIZ_HEALTH_FAIL_THRESHOLD", 5),
  restartDelayMs: numEnv("ABCL_SECVIZ_RESTART_DELAY_MS", 2_000),
  maxRestartDelayMs: numEnv("ABCL_SECVIZ_MAX_RESTART_DELAY_MS", 60_000),
  forceKillGraceMs: numEnv("ABCL_SECVIZ_FORCE_KILL_GRACE_MS", 10_000),
  startupGraceMs: numEnv("ABCL_SECVIZ_STARTUP_GRACE_MS", 30_000),
  cleanupIntervalMs: numEnv("ABCL_SECVIZ_CLEANUP_INTERVAL_MS", 10 * 60_000),
  logDir: process.env.ABCL_SECVIZ_LOG_DIR ?? join(repoRoot, "var", "log"),
  logMaxBytes: numEnv("ABCL_SECVIZ_LOG_MAX_BYTES", 10 * 1024 * 1024),
  logMaxFiles: numEnv("ABCL_SECVIZ_LOG_MAX_FILES", 5),
  frontendMode: process.env.ABCL_SECVIZ_FRONTEND_MODE ?? "dev",
  stabilityIntervalMs: numEnv("ABCL_SECVIZ_STABILITY_INTERVAL_MS", 30_000),
  maxRssMb: numEnv("ABCL_SECVIZ_MAX_RSS_MB", 1500),
  maxCpuPct: numEnv("ABCL_SECVIZ_MAX_CPU_PCT", 90),
  stabilityStrikes: numEnv("ABCL_SECVIZ_STABILITY_STRIKES", 4),
  loadPressure: Number(process.env.ABCL_SECVIZ_LOAD_PRESSURE ?? 4.0),
  minFreeMb: numEnv("ABCL_SECVIZ_MIN_FREE_MB", 500),
  maxNodeProcs: numEnv("ABCL_SECVIZ_MAX_NODE_PROCS", 30),
  breakerRestarts: numEnv("ABCL_SECVIZ_BREAKER_RESTARTS", 10),
  breakerWindowMs: numEnv("ABCL_SECVIZ_BREAKER_WINDOW_MS", 5 * 60_000),
};
cfg.frontendHealthUrl =
  process.env.ABCL_SECVIZ_FRONTEND_HEALTH_URL ?? `http://127.0.0.1:${cfg.frontendPort}/`;
cfg.apiHealthUrl =
  process.env.ABCL_SECVIZ_API_HEALTH_URL ?? `http://127.0.0.1:${cfg.apiPort}/api/healthz`;
cfg.osintHealthUrl =
  process.env.ABCL_SECVIZ_OSINT_HEALTH_URL ?? `http://127.0.0.1:${cfg.osintPort}/`;

mkdirSync(cfg.logDir, { recursive: true });
const supervisorLogPath = join(cfg.logDir, "supervisor.log");
const stabilityLogPath = join(cfg.logDir, "stability.log");
let supervisorLogFd = openSync(supervisorLogPath, "a");
let stabilityLogFd = openSync(stabilityLogPath, "a");
let diskPressure = false;

function ts() {
  return new Date().toISOString();
}

function log(level, fields) {
  const line = JSON.stringify({ time: ts(), level, supervisor: "abcl-secviz", ...fields }) + "\n";
  process.stdout.write(line);
  if (diskPressure) return; // stderr-only when disk is full
  try {
    rotateIfTooBig(supervisorLogPath, () => {
      try { closeSync(supervisorLogFd); } catch {}
      supervisorLogFd = openSync(supervisorLogPath, "a");
    });
    writeSync(supervisorLogFd, line);
  } catch {
    // best-effort
  }
}

function logStability(fields) {
  const line = JSON.stringify({ time: ts(), ...fields }) + "\n";
  if (diskPressure) return;
  try {
    rotateIfTooBig(stabilityLogPath, () => {
      try { closeSync(stabilityLogFd); } catch {}
      stabilityLogFd = openSync(stabilityLogPath, "a");
    });
    writeSync(stabilityLogFd, line);
  } catch {
    // best-effort
  }
}

function rotateIfTooBig(p, onRotate) {
  try {
    const s = statSync(p);
    if (s.size < cfg.logMaxBytes) return;
  } catch {
    return;
  }
  for (let i = cfg.logMaxFiles - 1; i >= 1; i--) {
    const from = `${p}.${i}`;
    const to = `${p}.${i + 1}`;
    if (existsSync(from)) {
      try {
        if (i === cfg.logMaxFiles - 1) {
          try { fsRmSync(to, { force: true }); } catch {}
        }
        renameSync(from, to);
      } catch {}
    }
  }
  try { renameSync(p, `${p}.1`); } catch {}
  if (onRotate) onRotate();
}

// -- /proc sampling -----------------------------------------------------

// Linux jiffies-per-second (almost always 100). Pulled from sysconf when available.
const HZ = (() => {
  try {
    return Number(execSync("getconf CLK_TCK", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()) || 100;
  } catch {
    return 100;
  }
})();

function readProcStat(pid) {
  try {
    const raw = readFileSync(`/proc/${pid}/stat`, "utf8");
    // The 2nd field is `(comm)` which can contain spaces and parens; find the
    // last ')' and split from there to get fields 3..end.
    const close = raw.lastIndexOf(")");
    const fields = raw.slice(close + 2).split(" ");
    // fields[11] = utime, fields[12] = stime (0-indexed from after comm,
    // so it's index 11/12 because the first two columns were pid+comm).
    const utime = Number(fields[11]);
    const stime = Number(fields[12]);
    return { jiffies: utime + stime };
  } catch {
    return null;
  }
}

function readProcRssMb(pid) {
  try {
    const raw = readFileSync(`/proc/${pid}/status`, "utf8");
    const m = raw.match(/VmRSS:\s+(\d+)\s+kB/);
    return m ? Math.round(Number(m[1]) / 1024) : null;
  } catch {
    return null;
  }
}

// -- child management ---------------------------------------------------

class ManagedChild {
  constructor({ name, command, args, cwd, env = {}, healthUrl, startupGraceMs, essential = true, preStart, tcpHealth }) {
    this.name = name;
    this.command = command;
    this.args = args;
    this.cwd = cwd;
    this.env = env;
    this.healthUrl = healthUrl;
    this.tcpHealth = tcpHealth; // { host, port } for non-HTTP services like Postgres
    this.preStart = preStart; // optional sync callback before each spawn
    this.startupGraceMs = startupGraceMs ?? cfg.startupGraceMs;
    this.essential = essential;
    this.proc = null;
    this.restarts = 0;
    this.restartHistory = []; // timestamps for circuit breaker
    this.lastStartedAt = 0;
    this.healthFailures = 0;
    this.shuttingDown = false;
    this.quarantined = false;
    this.nextDelayMs = cfg.restartDelayMs;
    this.restartTimer = null;
    this.killTimer = null;
    this.logPath = join(cfg.logDir, `${name}.log`);
    // stability state
    this.lastSample = null; // { jiffies, monoMs }
    this.rssStrikes = 0;
    this.cpuStrikes = 0;
  }

  start(reason = "boot") {
    if (this.proc || this.shuttingDown || this.quarantined) return;
    this.lastStartedAt = Date.now();
    log("info", { event: "child_starting", child: this.name, reason });
    if (typeof this.preStart === "function") {
      try {
        this.preStart();
      } catch (e) {
        log("warn", { event: "child_prestart_error", child: this.name, err: e.message });
      }
    }
    rotateIfTooBig(this.logPath);
    const out = openSync(this.logPath, "a");
    this.proc = spawn(this.command, this.args, {
      cwd: this.cwd,
      env: { ...process.env, ...this.env },
      stdio: ["ignore", out, out],
      detached: true,
    });
    closeSync(out);
    const pid = this.proc.pid;
    this.pgid = pid;
    this.lastSample = null;
    this.rssStrikes = 0;
    this.cpuStrikes = 0;
    log("info", { event: "child_started", child: this.name, pid, reason });
    this.proc.on("exit", (code, signal) => {
      log("warn", { event: "child_exited", child: this.name, pid, code, signal });
      this.proc = null;
      if (this.killTimer) { clearTimeout(this.killTimer); this.killTimer = null; }
      this.signalGroup("SIGKILL");
      if (this.shuttingDown) return;
      this.scheduleRestart(`exited code=${code} signal=${signal}`);
    });
    this.proc.on("error", (err) => {
      log("error", { event: "child_spawn_error", child: this.name, err: err.message });
    });
  }

  scheduleRestart(reason) {
    if (this.shuttingDown || this.restartTimer || this.quarantined) return;
    // Circuit breaker: too many restarts in window → quarantine
    const now = Date.now();
    this.restartHistory.push(now);
    this.restartHistory = this.restartHistory.filter((t) => now - t < cfg.breakerWindowMs);
    if (this.restartHistory.length >= cfg.breakerRestarts) {
      this.quarantined = true;
      log("error", {
        event: "child_quarantined",
        child: this.name,
        recentRestarts: this.restartHistory.length,
        windowMs: cfg.breakerWindowMs,
        reason: "too many restarts — health-check only, no auto-restart",
      });
      return;
    }
    // Load pressure: defer non-essential restarts when host is loaded
    const load = loadavg()[0] / Math.max(1, cpus().length);
    const delay = load > cfg.loadPressure && !this.essential
      ? Math.min(this.nextDelayMs * 2, cfg.maxRestartDelayMs)
      : this.nextDelayMs;
    this.nextDelayMs = Math.min(this.nextDelayMs * 2, cfg.maxRestartDelayMs);
    this.restarts += 1;
    log("warn", {
      event: "child_restart_scheduled",
      child: this.name,
      reason,
      delayMs: delay,
      restarts: this.restarts,
      loadFactor: Number(load.toFixed(2)),
    });
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      this.start("restart");
    }, delay);
  }

  resetBackoff() {
    this.nextDelayMs = cfg.restartDelayMs;
  }

  async checkHealth() {
    if (!this.proc) return;
    if (!this.healthUrl && !this.tcpHealth) return;
    if (Date.now() - this.lastStartedAt < this.startupGraceMs) return;
    let ok = false;
    let detail = "";
    if (this.healthUrl) {
      try {
        const r = await fetch(this.healthUrl, { signal: AbortSignal.timeout(cfg.healthTimeoutMs) });
        ok = r.status < 500;
        detail = `HTTP ${r.status}`;
      } catch (e) {
        ok = false;
        detail = e.message;
      }
    } else if (this.tcpHealth) {
      ok = await tcpProbe(this.tcpHealth.host, this.tcpHealth.port, cfg.healthTimeoutMs)
        .then(() => true)
        .catch(() => false);
      detail = ok ? "TCP ok" : "TCP fail";
    }
    if (ok) {
      if (this.healthFailures > 0) {
        log("info", { event: "child_health_recovered", child: this.name, detail });
      }
      this.healthFailures = 0;
      this.resetBackoff();
      // Recovery from quarantine: if health is good, allow restart again
      if (this.quarantined) {
        log("info", { event: "child_quarantine_lifted", child: this.name });
        this.quarantined = false;
        this.restartHistory = [];
      }
      return;
    }
    this.healthFailures += 1;
    log("warn", {
      event: "child_health_fail",
      child: this.name,
      failures: this.healthFailures,
      threshold: cfg.healthFailThreshold,
      detail,
    });
    if (this.healthFailures >= cfg.healthFailThreshold && this.proc) {
      log("error", { event: "child_health_kill", child: this.name, pid: this.proc.pid });
      this.healthFailures = 0;
      this.killCurrent("health-check");
    }
  }

  sampleStability() {
    if (!this.proc) return null;
    if (Date.now() - this.lastStartedAt < this.startupGraceMs) return null;
    const pid = this.proc.pid;
    const rssMb = readProcRssMb(pid);
    const cur = readProcStat(pid);
    const nowMs = Date.now();
    let cpuPct = null;
    if (cur && this.lastSample) {
      const elapsedJiffies = cur.jiffies - this.lastSample.jiffies;
      const elapsedMs = nowMs - this.lastSample.monoMs;
      if (elapsedMs > 0) {
        // jiffies → seconds via HZ, then × 100 for percent of one CPU
        cpuPct = ((elapsedJiffies / HZ) / (elapsedMs / 1000)) * 100;
      }
    }
    if (cur) this.lastSample = { jiffies: cur.jiffies, monoMs: nowMs };

    const sample = { child: this.name, pid, rssMb, cpuPct: cpuPct == null ? null : Number(cpuPct.toFixed(1)) };
    logStability(sample);

    // RSS guard
    if (rssMb != null && rssMb > cfg.maxRssMb) {
      this.rssStrikes += 1;
      if (this.rssStrikes >= cfg.stabilityStrikes) {
        log("error", {
          event: "child_rss_overrun",
          child: this.name,
          pid,
          rssMb,
          limitMb: cfg.maxRssMb,
          strikes: this.rssStrikes,
        });
        this.rssStrikes = 0;
        this.killCurrent("rss_overrun");
        return sample;
      }
    } else {
      this.rssStrikes = 0;
    }

    // CPU guard
    if (cpuPct != null && cpuPct > cfg.maxCpuPct) {
      this.cpuStrikes += 1;
      if (this.cpuStrikes >= cfg.stabilityStrikes) {
        log("error", {
          event: "child_cpu_overrun",
          child: this.name,
          pid,
          cpuPct: Number(cpuPct.toFixed(1)),
          limitPct: cfg.maxCpuPct,
          strikes: this.cpuStrikes,
        });
        this.cpuStrikes = 0;
        this.killCurrent("cpu_overrun");
        return sample;
      }
    } else {
      this.cpuStrikes = 0;
    }

    return sample;
  }

  signalGroup(sig) {
    if (this.pgid) {
      try {
        process.kill(-this.pgid, sig);
        return;
      } catch {
        // group already gone — fall through
      }
    }
    if (this.proc) {
      try { this.proc.kill(sig); } catch {}
    }
  }

  killCurrent(reason) {
    if (!this.proc || this.killTimer) return;
    log("warn", { event: "child_killing", child: this.name, reason });
    this.signalGroup("SIGTERM");
    this.killTimer = setTimeout(() => {
      this.signalGroup("SIGKILL");
      this.killTimer = null;
    }, cfg.forceKillGraceMs);
  }

  async stop() {
    this.shuttingDown = true;
    if (this.restartTimer) { clearTimeout(this.restartTimer); this.restartTimer = null; }
    if (!this.proc) return;
    const proc = this.proc;
    log("info", { event: "child_stop_requested", child: this.name, pid: proc.pid });
    this.signalGroup("SIGTERM");
    const killTimer = setTimeout(() => this.signalGroup("SIGKILL"), cfg.forceKillGraceMs);
    await new Promise((r) => proc.once("exit", () => r()));
    clearTimeout(killTimer);
    log("info", { event: "child_stopped", child: this.name });
  }
}

// -- stability sweeps ---------------------------------------------------

async function checkDiskPressure() {
  try {
    const s = await statfs(cfg.logDir);
    const freeMb = (s.bavail * s.bsize) / (1024 * 1024);
    const wasPressure = diskPressure;
    diskPressure = freeMb < cfg.minFreeMb;
    if (diskPressure && !wasPressure) {
      log("error", { event: "disk_pressure", freeMb: Math.round(freeMb), minFreeMb: cfg.minFreeMb });
    } else if (!diskPressure && wasPressure) {
      log("info", { event: "disk_pressure_cleared", freeMb: Math.round(freeMb) });
    }
  } catch {
    // statfs unavailable — ignore
  }
}

function countNodeProcs() {
  try {
    const out = execSync("pgrep -c node", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return Number(out) || 0;
  } catch {
    return 0;
  }
}

async function stabilitySweep(children) {
  await checkDiskPressure();
  for (const c of children) c.sampleStability();
  const load = loadavg()[0];
  const nproc = Math.max(1, cpus().length);
  const loadFactor = load / nproc;
  const nodeProcs = countNodeProcs();
  logStability({ event: "host", load1: Number(load.toFixed(2)), loadFactor: Number(loadFactor.toFixed(2)), nproc, nodeProcs });
  if (nodeProcs > cfg.maxNodeProcs) {
    log("warn", {
      event: "node_proc_count_high",
      nodeProcs,
      threshold: cfg.maxNodeProcs,
      action: "scheduling_cleanup",
    });
    void runCleanup();
  }
}

// -- temp cleanup -------------------------------------------------------

const cleanupTargets = [
  // Vite dependency cache (rebuilds as needed)
  { dir: join(repoRoot, "node_modules", ".vite"), olderThanMs: 7 * 24 * 60 * 60_000 },
  // Vitest temp
  { dir: join(repoRoot, "node_modules", ".vitest"), olderThanMs: 7 * 24 * 60 * 60_000 },
  // System temp scratch we may have created
  { dir: "/tmp", prefix: "abcl-secviz-", olderThanMs: 24 * 60 * 60_000 },
  // Rotated supervisor / dev-server logs older than 14 days
  { dir: cfg.logDir, namePattern: /\.\d+$/, olderThanMs: 14 * 24 * 60 * 60_000 },
];

async function runCleanup() {
  let removed = 0;
  let bytes = 0;
  for (const t of cleanupTargets) {
    let entries;
    try {
      entries = await readdir(t.dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (t.prefix && !name.startsWith(t.prefix)) continue;
      if (t.namePattern && !t.namePattern.test(name)) continue;
      const full = join(t.dir, name);
      try {
        const s = await statAsync(full);
        if (Date.now() - s.mtimeMs < t.olderThanMs) continue;
        const size = s.isDirectory() ? 0 : s.size;
        await rm(full, { recursive: true, force: true });
        removed += 1;
        bytes += size;
      } catch (e) {
        log("warn", { event: "cleanup_error", path: full, err: e.message });
      }
    }
  }
  if (removed > 0) log("info", { event: "cleanup_done", removed, bytes });
}

// -- orchestration ------------------------------------------------------

function resolvePnpmBin() {
  if (process.env.PNPM_BIN) return resolve(process.env.PNPM_BIN);
  try {
    const out = execSync("command -v pnpm", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    if (out) return out;
  } catch {}
  const candidates = [
    `${process.env.HOME}/.local/share/pnpm/pnpm`,
    `${process.env.HOME}/.local/node/node-v20.19.5-linux-x64/bin/pnpm`,
    "/usr/local/bin/pnpm",
    "/usr/bin/pnpm",
  ];
  for (const c of candidates) {
    try {
      if (statSync(c).isFile()) return c;
    } catch {}
  }
  throw new Error(
    "pnpm not found. Install it (npm i -g pnpm) or set PNPM_BIN to its absolute path.",
  );
}

const pnpmBin = resolvePnpmBin();

const args =
  cfg.frontendMode === "preview"
    ? ["exec", "vite", "preview", "--host", "0.0.0.0", "--port", String(cfg.frontendPort)]
    : ["run", "dev"];

const frontend = new ManagedChild({
  name: "dev-server",
  command: pnpmBin,
  args,
  cwd: repoRoot,
  env: { VITE_PORT: String(cfg.frontendPort), FRONTEND_PORT: String(cfg.frontendPort) },
  healthUrl: cfg.frontendHealthUrl,
});

const children = [frontend];

// Postgres child for the OSINT backend. Enabled when ABCL_SECVIZ_PG_BIN and
// ABCL_SECVIZ_PG_DATA are both set. The api-server has built-in connection
// retry, so it tolerates a delayed DB start.
if (cfg.pgBin && cfg.pgData) {
  const postgresBin = join(cfg.pgBin, "postgres");
  if (!existsSync(postgresBin)) {
    log("warn", { event: "postgres_disabled", reason: "bin_missing", path: postgresBin });
  } else if (!existsSync(cfg.pgData)) {
    log("warn", { event: "postgres_disabled", reason: "data_missing", path: cfg.pgData });
  } else {
    const pgArgs = ["-D", cfg.pgData, "-p", String(cfg.pgPort), "-h", cfg.pgHost];
    if (cfg.pgRunDir) pgArgs.push("-k", cfg.pgRunDir);
    const postgres = new ManagedChild({
      name: "postgres",
      command: postgresBin,
      args: pgArgs,
      cwd: cfg.pgData,
      healthUrl: null,
      tcpHealth: { host: cfg.pgHost, port: cfg.pgPort },
      startupGraceMs: 60_000, // postgres recovery can be slow
      preStart: () => {
        // Clean stale Unix-socket lock if no process holds it. pg_ctl
        // normally does this, but we spawn `postgres` directly so we have
        // to do it ourselves. We only nuke the lock when no PID inside it
        // is alive — a live postgres would still own these.
        if (!cfg.pgRunDir) return;
        const sock = join(cfg.pgRunDir, `.s.PGSQL.${cfg.pgPort}`);
        const lock = `${sock}.lock`;
        if (!existsSync(lock)) return;
        let owner = null;
        try {
          const first = readFileSync(lock, "utf8").split("\n")[0].trim();
          const n = Number(first);
          if (Number.isFinite(n) && n > 0) owner = n;
        } catch {}
        let alive = false;
        if (owner) {
          try { process.kill(owner, 0); alive = true; } catch {}
        }
        if (!alive) {
          for (const p of [sock, lock]) {
            try { unlinkSync(p); } catch {}
          }
          log("info", { event: "postgres_stale_lock_cleaned", port: cfg.pgPort });
        }
      },
    });
    children.push(postgres);
  }
}

if (!cfg.disableApi) {
  const api = new ManagedChild({
    name: "api-server",
    command: pnpmBin,
    args: ["--filter", "day2-secops-server", "run", "dev"],
    cwd: repoRoot,
    env: {
      PORT: String(cfg.apiPort),
      DAY2_SECOPS_FRONTEND_ORIGIN: `http://localhost:${cfg.frontendPort}`,
    },
    healthUrl: cfg.apiHealthUrl,
  });
  children.push(api);
}

if (cfg.osintCwd) {
  if (!existsSync(cfg.osintCwd)) {
    log("warn", {
      event: "osint_disabled",
      reason: "cwd_missing",
      cwd: cfg.osintCwd,
    });
  } else {
    // OSINT env: pass the Vite frontend port via VITE_PORT/FRONTEND_PORT only.
    // Do NOT set PORT — when the OSINT cwd is a monorepo root, `pnpm run dev`
    // also spawns an api-server that reads PORT from .env, and clobbering that
    // here would force the API to bind the same port as the frontend.
    const osint = new ManagedChild({
      name: "osint",
      command: pnpmBin,
      args: ["run", "dev"],
      cwd: cfg.osintCwd,
      env: {
        VITE_PORT: String(cfg.osintPort),
        FRONTEND_PORT: String(cfg.osintPort),
      },
      healthUrl: cfg.osintHealthUrl,
      essential: false, // OSINT is nice-to-have; don't pile on under load pressure
    });
    children.push(osint);
  }
} else {
  log("info", { event: "osint_disabled", reason: "ABCL_SECVIZ_OSINT_CWD unset" });
}

let healthTimer = null;
let cleanupTimer = null;
let stabilityTimer = null;
let shutting = false;

async function shutdown(signal) {
  if (shutting) return;
  shutting = true;
  log("info", { event: "supervisor_shutdown", signal });
  if (healthTimer) clearInterval(healthTimer);
  if (cleanupTimer) clearInterval(cleanupTimer);
  if (stabilityTimer) clearInterval(stabilityTimer);
  await Promise.all(children.map((c) => c.stop()));
  log("info", { event: "supervisor_stopped" });
  try { closeSync(supervisorLogFd); } catch {}
  try { closeSync(stabilityLogFd); } catch {}
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGHUP", () => {
  log("info", { event: "sighup_received" });
  void runCleanup();
});
process.on("unhandledRejection", (err) => {
  log("error", { event: "unhandled_rejection", err: String(err) });
});
process.on("uncaughtException", (err) => {
  log("error", { event: "uncaught_exception", err: err.message, stack: err.stack });
});

log("info", {
  event: "supervisor_starting",
  pid: process.pid,
  repo: repoRoot,
  config: {
    frontendPort: cfg.frontendPort,
    apiPort: cfg.apiPort,
    apiEnabled: !cfg.disableApi,
    osintCwd: cfg.osintCwd || null,
    osintPort: cfg.osintCwd ? cfg.osintPort : null,
    frontendMode: cfg.frontendMode,
    healthIntervalMs: cfg.healthIntervalMs,
    cleanupIntervalMs: cfg.cleanupIntervalMs,
    stabilityIntervalMs: cfg.stabilityIntervalMs,
    maxRssMb: cfg.maxRssMb,
    maxCpuPct: cfg.maxCpuPct,
    stabilityStrikes: cfg.stabilityStrikes,
  },
});

// Initial cleanup before anything starts.
await runCleanup();
await checkDiskPressure();

for (const c of children) c.start("boot");

healthTimer = setInterval(() => {
  for (const c of children) void c.checkHealth();
}, cfg.healthIntervalMs);

cleanupTimer = setInterval(() => {
  void runCleanup();
}, cfg.cleanupIntervalMs);

stabilityTimer = setInterval(() => {
  void stabilitySweep(children);
}, cfg.stabilityIntervalMs);

log("info", { event: "supervisor_running", children: children.map((c) => c.name) });
