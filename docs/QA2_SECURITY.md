# Security Review — Delta QA2

Scope: delta items as specified. Static analysis only; no runtime testing.

---

## 1. insint.json static import — trust boundary [LOW]

**Finding:** `VulnInsint.tsx` casts `insintRaw as InsintFile` with no runtime schema validation. CVE titles and source names render as React text nodes (`{c.title}`, `{s.name}`), not via `innerHTML` or `dangerouslySetInnerHTML`. React's JSX text interpolation escapes all HTML entities automatically, so injection into the DOM is not possible at the current rendering site.

**Trust boundary today:** The file is a build-time static import. It is bundled at compile time and cannot be modified at runtime by an external actor. The trust boundary is acceptable for demo data.

**Future-flip risk (MEDIUM — plan for it now):** If this data source is later changed to a `fetch()` call against a live endpoint (`/api/insint`), the cast-without-validation pattern becomes dangerous. An attacker who can influence the API response could supply a `title` string that is later passed to a component using `innerHTML` elsewhere, or a non-enum `severity` value that breaks the `SEVERITY_TONE` lookup and causes a rendering fault. The `InsintFile` interface is a TypeScript-only contract; it is erased at runtime.

**Recommendation:** Before any migration to runtime fetching, add a Zod (or equivalent) schema that validates the shape and constrains `severity` to the allowed enum values. One schema, validated once on ingest, covers both the static and future live cases.

---

## 2. VITE_DAY2_OSINT_URL in anchor href — javascript: protocol [HIGH]

**Finding:** `VulnOsint.tsx` places the env-var value directly into `<a href={DAY2_OSINT_URL}>` with no protocol check. If `VITE_DAY2_OSINT_URL` is set to `javascript:alert(1)` (or any `javascript:` URI) in the build environment, the link becomes an XSS vector — clicking it executes script in the page origin. `rel="noopener noreferrer"` mitigates window-opener attacks but does nothing against `javascript:` execution.

**Attack surface:** An actor with write access to the `.env` file or the CI/CD secret store supplying `VITE_DAY2_OSINT_URL` can inject arbitrary JavaScript into every user's session who clicks the button. This is a build-time injection, not a runtime one, but the exposure is real.

**Recommendation:** Validate the URL before rendering. A one-line guard is sufficient:

```ts
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

const DAY2_OSINT_URL =
  (import.meta.env.VITE_DAY2_OSINT_URL as string | undefined) ?? "http://localhost:5173";

const safeUrl = isSafeUrl(DAY2_OSINT_URL) ? DAY2_OSINT_URL : "http://localhost:5173";
```

Use `safeUrl` in the anchor. This fully eliminates the `javascript:` and `data:` protocol classes.

---

## 3. Redirects in App.tsx — open-redirect risk [NONE]

**Finding:** Both new redirects (`/change` to `/config/changes` and `/audit/:framework` to `/audit/by-framework/:framework`) are fully internal. The `framework` parameter from `/audit/:framework` is interpolated into a path segment on the same origin using wouter's `<Redirect to={...}>`. Wouter's `to` prop is a relative path that the router resolves against the configured base; it does not trigger a browser-level navigation to an external origin.

There is also a guard that catches the known reserved values (`checklist`, `docs`, `by-framework`) and renders `<NotFound>` instead of redirecting, preventing those from silently misrouting. No open-redirect issue.

---

## 4. Sidebar collapse state in component state — auth leakage [NONE]

**Finding:** `AppLayout` wraps `Sidebar` unconditionally for every route — including `/admin/login`. The sidebar nav items are always rendered. However, this is a purely cosmetic navigation element; it contains no data, no credentials, and no PII. The sidebar itself has no auth-gating logic, but no sensitive information is exposed through it. The application appears to rely on page-level auth checks (AdminGate pattern), not on sidebar visibility as a security boundary. No leakage concern.

---

## 5. SecurityScoringPanel reason label rendering — HTML injection [NONE]

**Finding:** Reason labels are rendered as `<li key={ri}>{r.label}</li>` — plain JSX text interpolation. React escapes the content. Cause flag strings flow through `rankByRisk()` in `src/lib/visibility/risk.ts` and are author-controlled label strings, not user-supplied input. No injection path exists at the current rendering site.

---

## 6. Sops.tsx and Policies.tsx — user-controlled markdown risk [NONE]

**Finding:** Both files declare their data as `const` arrays of typed literals with no external data source, no `fetch`, no markdown parser, and no `dangerouslySetInnerHTML`. All string fields render as React text nodes. There is no mechanism by which user input could reach these components today. If a markdown renderer is introduced later, a sanitisation step (e.g., DOMPurify before passing to `dangerouslySetInnerHTML`, or use of `react-markdown` with restricted elements) must be added at that point.

---

## 7. Placeholder CVE identifiers [NONE]

**Finding:** CVE strings such as `CVE-2025-12345` and `CVE-2025-04001` appear only in `workspaces/abcl/insint.json`. They are displayed as plain text via `{c.cve}` and used as React `key` props. No code path passes them to a lookup service, a URL, or an external API. No validation pipeline in this delta assumes they resolve to real NVD records. No risk.

---

## 8. logo.dev publishable token in bundle [LOW — accepted]

**Finding:** `src/lib/brand/logo-url.ts` embeds `pk_X-1ZO13GSgeOoUrIuJ6GMQ` as the default logo.dev token. The token is of the `pk_` publishable-key class. logo.dev's own documentation and usage model explicitly intends this key to be shipped client-side, analogous to Stripe's `pk_` keys. The worst-case abuse is quota exhaustion on the token, not credential compromise or data access. The comment in the file correctly documents this decision.

The `VITE_LOGO_DEV_TOKEN` env-var override is present and functional for deployments that want their own quota. No action required; the pattern is intentional and the risk is accepted and bounded.

---

## Summary

| # | Area | Severity | Status |
|---|------|----------|--------|
| 1 | insint.json — no runtime schema; future fetch risk | LOW (now) / MEDIUM (on flip) | Add Zod schema before going live |
| 2 | VITE_DAY2_OSINT_URL — missing protocol validation on href | HIGH | Fix before production |
| 3 | App.tsx redirects — open redirect | NONE | Clear |
| 4 | Sidebar on unauthenticated routes | NONE | Clear |
| 5 | SecurityScoringPanel reason labels | NONE | Clear |
| 6 | Sops/Policies user markdown | NONE | Clear (note for Phase-real) |
| 7 | Placeholder CVE strings | NONE | Clear |
| 8 | logo.dev publishable token | LOW (accepted) | Documented; no action required |

**Blocking item before production:** Item 2 (protocol validation on the OSINT URL). All others are either clear or deferred to Phase-real with a documented plan.
