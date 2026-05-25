# QA Round 2 — Security Review

**Date:** 2026-05-23
**Scope:** abcl-secviz (frontend-only React SPA)
**Model:** claude-sonnet-4-6

---

## CRITICAL

### C-1 — VITE_WEBHOOK_SECRET shipped to the browser bundle

**File:** `src/lib/feeder/WebhookSource.ts:39`
**Risk:** Any env var prefixed `VITE_` is inlined into the JS bundle by Vite at build time and is readable by anyone who fetches the asset. The `VITE_WEBHOOK_SECRET_<TOOL_ID>` values are intended as HMAC signing secrets; exposing them to the client makes HMAC verification meaningless — an attacker who reads the bundle can forge any payload.
**Fix:** HMAC verification must happen server-side. Move webhook reception to an Express/Edge worker that holds the secret in a non-`VITE_` env var. The browser should poll a signed, internal endpoint, not receive raw OEM payloads.

---

### C-2 — No schema validation on localStorage deserialization (snapshot store and recentlyViewed)

**Files:** `src/lib/change/snapshots.ts:36`, `src/lib/recentlyViewed.ts:19`
**Risk:** Both stores do a bare `JSON.parse(raw) as StoreShape` / `as RecentItem[]` with no Zod (or equivalent) validation. If an attacker achieves XSS and writes a crafted object into `abcl-secviz:snapshots`, the snapshot diff renderer and ChangeManagement page will consume arbitrary `solution`, `detail`, and `source` strings. When real OEM tool data is stored in snapshots, a poisoned entry could corrupt the integrity audit trail or exfiltrate data on render. `recentlyViewed.ts` stores a `title` field the same way.
**Fix:** Run all three deserialized blobs through the existing Zod schemas (`ToolSchema`, `SnapshotMeta`) before use; discard malformed entries rather than casting.

---

## HIGH

### H-1 — No Content-Security-Policy in index.html

**File:** `index.html` (entire file)
**Risk:** There is no `<meta http-equiv="Content-Security-Policy">` and no indication of a server-side CSP header. Without a CSP, any XSS (including via the localStorage deserialization path above) can exfiltrate data to an arbitrary origin with no browser-level backstop.
**Fix:** Add a strict CSP. For a static SPA with no inline scripts (except the one Vite injects), the minimum viable policy is: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'`. For the prod CDN build, add nonces to the Vite-injected script tag via the Vite `transformIndexHtml` plugin hook.

### H-2 — Webhook URL is fetched from the browser; no domain allowlist

**File:** `src/lib/feeder/WebhookSource.ts:62` (TODO comment)
**Risk:** When Phase-real lands, the URL per tool will be resolved from `VITE_WEBHOOK_URL_<TOOL_ID>`. Because Vite inlines these into the bundle, a supply-chain compromise or build-environment injection could redirect fetches to an attacker-controlled endpoint. Additionally, the browser is not the correct entity to initiate a cross-origin POST to an internal OEM endpoint: the request will be either blocked by CORS or require a wide CORS allowlist on OEM infrastructure, widening the attack surface.
**Fix:** Before implementing, define an explicit allowlist of permitted URL prefixes (e.g., `*.example.internal`). Validate the resolved URL against this allowlist before calling `fetch`. Better: proxy via a thin backend so the browser never talks directly to OEM endpoints.

### H-3 — `u.note` from MockSource rendered in a toast without sanitization

**File:** `src/components/Feeder/FeederProvider.tsx:109`
**Risk:** `u.note` is a free-form string produced by `MockSource`. When `WebhookSource.fetch` is implemented, `note` will come from a parsed OEM response. If that JSON is not validated and a webhook payload contains `"note": "<img src=x onerror=alert(1)>"`, it will be passed directly to Sonner's `toast()`. Whether this executes depends on Sonner's rendering, but it is an unsanitized external string entering the render tree.
**Fix:** After implementing `WebhookSource`, validate the `note` field length and character set (or strip it entirely from the `VisibilityUpdate` shape). A `z.string().max(200).regex(/^[\w\s.,;:()\-]+$/)` guard on the Zod schema for the parsed webhook response body is sufficient.

### H-4 — `vite.config.ts` binds to `host: "0.0.0.0"` with `allowedHosts: true`

**File:** `vite.config.ts:45-48`
**Risk:** `allowedHosts: true` disables Vite's Host header check. Combined with `0.0.0.0` binding, the dev server accepts requests with any `Host` value, enabling DNS rebinding attacks from any network the dev machine is reachable on. Preview mode (`vite preview`) is identically configured and should never be used as a production server.
**Fix:** Set `allowedHosts` to an explicit array (`["localhost", "127.0.0.1"]`) for dev, or restrict the bind to `127.0.0.1` when not running inside a container that needs external reach.

---

## MEDIUM

### M-1 — Env var naming mismatch between .env.example documentation and implementation

**Files:** `.env.example:12-19`, `src/lib/feeder/WebhookSource.ts:38-39`
**Risk:** `.env.example` documents `WEBHOOK_URL_<TOOL_ID>` and `WEBHOOK_SECRET_<TOOL_ID>` (no `VITE_` prefix). The implementation reads `VITE_WEBHOOK_URL_*` and `VITE_WEBHOOK_SECRET_*`. A developer following the documented template will configure the wrong variable names; the secrets will silently be undefined and HMAC verification will be skipped without error.
**Fix:** Align `.env.example` examples to use the `VITE_` prefix, and add a startup assertion in `WebhookSource` that warns if both URL and secret are not set together for an owned tool.

### M-2 — `workspace-overlay.ts` validates only the `seeds` array shape, not each seed

**File:** `src/lib/workspace-overlay.ts:27`
**Risk:** After `JSON.parse`, only `Array.isArray(parsed.seeds)` is checked. Individual seed objects are not run through `ToolSeedSchema`. A poisoned overlay could inject a seed with an oversized `denominator` or a malformed `id` containing path-traversal characters, which later code may forward to a backend in Phase-real.
**Fix:** Replace the `Array.isArray` guard with `z.array(ToolSeedSchema).safeParse(parsed.seeds)` and use the `.data` value on success.

### M-3 — `Vite preview` mode (`frontendMode: "preview"`) binds to `0.0.0.0`

**File:** `scripts/stack-supervisor.mjs:335-337`, `vite.config.ts:48`
**Risk:** The supervisor can start Vite in `preview` mode serving the production bundle on `0.0.0.0`. If this is used for internal demos with real OEM data loaded, the build artifact is reachable on all interfaces with no authentication.
**Fix:** Document that preview mode is for local validation only. If used internally, put it behind a reverse proxy with mTLS or at minimum an IP allowlist. Do not use `allowedHosts: true` in preview.

### M-4 — Supervisor log rotation off-by-one: oldest rotated log is never deleted

**File:** `scripts/stack-supervisor.mjs:101-113`
**Risk:** The `rotateIfTooBig` function renames `.N-1` to `.N` and renames the live file to `.1`, but never explicitly removes `.logMaxFiles`. The condition `i === cfg.logMaxFiles - 1` tries to remove the *next slot* before renaming into it, but when `i` reaches `logMaxFiles - 1`, `to` is `.logMaxFiles`, which is one beyond the intended max. On a long-running instance, rotated files can accumulate beyond the configured cap if the renaming path hits the boundary condition incorrectly.
**Fix:** After the rotation loop, add an explicit `fsRmSync(`${p}.${cfg.logMaxFiles + 1}`, { force: true })` cleanup, or rewrite the loop to count existing `.N` files and cap them.

---

## LOW

### L-1 — `preferences.ts` key namespace (`airowire-*`) leaks prior product name

**File:** `src/lib/preferences.ts:25-31`
**Risk:** Not a security vulnerability, but the stale `airowire-*` key names mean preferences silently collide if this SPA is ever co-deployed with an `airowire` product on the same origin. An attacker on the same origin (subdomain with loose cookies) could read or overwrite preferences.
**Fix:** Migrate keys to the `abcl-secviz:` namespace and clear the old keys on first run.

### L-2 — Missing security headers for production hosting

**File:** `index.html`, deployment (no header config present)
**Risk:** `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` are absent from both the HTML and any documented server/CDN configuration. These are low-effort wins that eliminate a class of embedding and MIME-sniffing attacks.
**Fix:** Add these at the CDN/reverse-proxy layer before the first real-data deployment. Reference `docs/web/security.md` template headers.

---

## SUMMARY TABLE

| ID | Severity | Area | One-line Fix |
|----|----------|------|--------------|
| C-1 | CRITICAL | Webhook / secrets | Move HMAC verification server-side; never expose secret via `VITE_` prefix |
| C-2 | CRITICAL | localStorage XSS | Run snapshot and recentlyViewed deserialization through Zod schemas |
| H-1 | HIGH | CSP | Add `Content-Security-Policy` header/meta before first real-data deploy |
| H-2 | HIGH | Webhook CORS / SSRF | Add URL allowlist; proxy OEM webhooks through a backend, not the browser |
| H-3 | HIGH | Feeder toast | Validate/strip `note` field in `VisibilityUpdate` via Zod before rendering |
| H-4 | HIGH | Dev server | Set `allowedHosts` to explicit array; avoid `0.0.0.0` + `allowedHosts: true` in prod |
| M-1 | MEDIUM | Config / docs | Align `.env.example` to use `VITE_` prefix matching the implementation |
| M-2 | MEDIUM | localStorage | Validate individual overlay seeds with `ToolSeedSchema` after parse |
| M-3 | MEDIUM | Preview mode | Document preview as local-only; add proxy/IP allowlist for any internal use |
| M-4 | MEDIUM | Log rotation | Fix off-by-one in `rotateIfTooBig` to guarantee oldest rotated file is removed |
| L-1 | LOW | LocalStorage | Migrate preferences keys from `airowire-*` to `abcl-secviz:` namespace |
| L-2 | LOW | Headers | Add HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` at CDN |

---

*No secrets were found hardcoded in source. The `dangerouslySetInnerHTML` in `src/components/ui/chart.tsx:79` uses only static `THEMES` keys and developer-supplied color strings from `ChartConfig`; it is not attacker-controllable in the current data flow and is a known Recharts/shadcn pattern — no action needed.*
