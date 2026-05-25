/**
 * Tiny session auth.
 *
 *   POST /api/admin/login    {username, password} → sets `day2_sid` cookie
 *   POST /api/admin/logout   destroys the cookie + session row
 *   middleware requireAdmin  checks cookie → sessions table → user role
 *
 * v1 is single-tenant. The first admin user is seeded from env on first boot
 * (DAY2_SECOPS_ADMIN_USERNAME + DAY2_SECOPS_ADMIN_PASSWORD); if missing, a
 * default admin/changeme is created with a loud WARN.
 */

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db, type UserRow } from "../db/index.js";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const COOKIE_NAME = "day2_sid";

function newId(): string {
  return randomBytes(18).toString("hex");
}

export function seedAdminIfMissing(): void {
  const existing = db.prepare("SELECT id FROM users LIMIT 1").get();
  if (existing) return;
  const username = process.env.DAY2_SECOPS_ADMIN_USERNAME ?? "admin";
  const password = process.env.DAY2_SECOPS_ADMIN_PASSWORD ?? "changeme";
  if (password === "changeme") {
    console.warn(
      "[auth] No DAY2_SECOPS_ADMIN_PASSWORD set — seeding default admin/changeme. ROTATE IMMEDIATELY.",
    );
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("INSERT INTO users (id, username, pw_hash, role) VALUES (?, ?, ?, ?)").run(
    newId(),
    username,
    hash,
    "admin",
  );
  console.log(`[auth] seeded admin user "${username}"`);
}

export interface LoginResult {
  ok: boolean;
  reason?: "invalid";
  user?: { id: string; username: string; role: string };
}

export function login(username: string, password: string): LoginResult & { sid?: string } {
  const row = db
    .prepare("SELECT id, username, pw_hash, role, created_at FROM users WHERE username = ?")
    .get(username) as UserRow | undefined;
  if (!row || !bcrypt.compareSync(password, row.pw_hash)) {
    return { ok: false, reason: "invalid" };
  }
  const sid = newId();
  const expiresIso = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(
    sid,
    row.id,
    expiresIso,
  );
  return {
    ok: true,
    sid,
    user: { id: row.id, username: row.username, role: row.role },
  };
}

export function logout(sid: string | undefined): void {
  if (!sid) return;
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sid);
}

export function userForSid(sid: string | undefined):
  | { id: string; username: string; role: string }
  | null {
  if (!sid) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.role
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.id = ? AND s.expires_at > datetime('now')`,
    )
    .get(sid) as { id: string; username: string; role: string } | undefined;
  return row ?? null;
}

export interface AuthedRequest extends Request {
  user?: { id: string; username: string; role: string };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const sid = req.cookies?.[COOKIE_NAME];
  const user = userForSid(sid);
  if (!user || user.role !== "admin") {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  (req as AuthedRequest).user = user;
  next();
}

export function setSidCookie(res: Response, sid: string): void {
  res.cookie(COOKIE_NAME, sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSidCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME);
}

export { COOKIE_NAME };
