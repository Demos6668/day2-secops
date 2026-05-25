import { Router } from "express";
import { z } from "zod";
import { clearSidCookie, COOKIE_NAME, login, logout, setSidCookie, userForSid } from "../../lib/auth.js";

export const adminAuthRouter = Router();

const LoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

adminAuthRouter.post("/login", (req, res) => {
  const body = LoginSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  const r = login(body.data.username, body.data.password);
  if (!r.ok || !r.sid) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }
  setSidCookie(res, r.sid);
  res.json({ ok: true, user: r.user });
});

adminAuthRouter.post("/logout", (req, res) => {
  logout(req.cookies?.[COOKIE_NAME]);
  clearSidCookie(res);
  res.json({ ok: true });
});

adminAuthRouter.get("/me", (req, res) => {
  const user = userForSid(req.cookies?.[COOKIE_NAME]);
  if (!user) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  res.json({ user });
});
