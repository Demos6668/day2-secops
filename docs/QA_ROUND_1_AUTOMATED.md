# QA Round 1 — Automated checks

**Date:** 2026-05-23
**Scope:** Static analysis, deterministic checks. Round 2 = manual code review (4 agents in parallel). Round 3 = functional smoke + remediation sweep.

## 1. TypeScript

```bash
pnpm typecheck   # tsc --noEmit
```

**Result:** ✅ clean. Zero errors. `tsconfig.base.json` runs with `strictNullChecks`, `noImplicitAny`, `noUnusedLocals`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `useUnknownInCatchVariables`. No `any`, no `@ts-expect-error` shortcuts.

## 2. ESLint

```bash
pnpm lint
```

**Result:** ✅ clean. No warnings, no errors.

## 3. Unit tests

```bash
pnpm test
```

**Result:** ✅ 4 test files, 25 tests pass.

| File | Tests | What it covers |
|---|---|---|
| `src/lib/visibility/__tests__/score.test.ts` | 9 | RAG score formula — severity weight, cause penalty, both Critical hard overrides, clamping, zero-denominator, threshold boundaries. |
| `src/lib/audit/__tests__/coverage.test.ts` | 7 | Per-cell coverage logic, control roll-up, framework totals. |
| `src/lib/change/__tests__/snapshots.test.ts` | 5 | Snapshot diffing — added/removed, status flips, ≥1% coverage shifts, cause-set deltas. |
| `src/lib/feasibility/__tests__/relations.test.ts` | 4 | Same-category edges, explicit adjacent rules, dedup, no-category exclusion. |

Coverage is concentrated on pure-function business logic (the score formula and the audit/diff/graph derivations). React component tests are deferred — visual regression buys more signal there.

## 4. Production build

```bash
pnpm build       # vite build
```

**Result:** ✅ clean, 1 m 50 s. Bundle layout (gzipped):

| Chunk | Raw | gzip | Notes |
|---|---|---|---|
| `index-*.js` (entry) | 421 KB | **128 KB** | React 19 + Tailwind v4 runtime + wouter + TanStack Query + shadcn primitives in use |
| `ui-*.js` | 220 KB | **73 KB** | manual-chunked: framer-motion + radix dialog + radix dropdown |
| `charts-*.js` | 388 KB | **107 KB** | recharts — lazy-loaded (only the score-breakdown sparkline and any future trend chart pulls it) |
| `Feasibility-*.js` | 168 KB | **54 KB** | xyflow — lazy-loaded behind `/feasibility` only |
| `Dashboard-*.js` | 36 KB | 11 KB | route chunk |
| `Audit-*.js` | 13 KB | 4 KB | route chunk |
| `ChangeManagement-*.js` | 7.6 KB | 3 KB | route chunk |
| `AddTool-*.js` | 10.5 KB | 4 KB | route chunk |
| `index-*.css` | 105 KB | 17 KB | Tailwind v4 output |

**Initial paint payload** (gzipped): index + ui + dashboard route + CSS ≈ **230 KB gz**. Charts + Feasibility only load when their routes/components mount.

> The 128 KB main entry is on the high side because the shadcn primitive set is generous (55 components, almost all imported somewhere). If we want to shave that further: tree-shake unused shadcn files via the `knip` pass in Round 3.

## 5. Supervisor + dev-server health

```bash
systemctl --user status abcl-secviz-stack.service
```

**Result:** ✅ active since 13:21:05 EDT. 26 min uptime when measured. Memory ~430 MB across supervisor + vite + esbuild service. Auto-restart verified at boot by killing vite and watching the supervisor respawn it in 2 s.

`var/log/`:
- `supervisor.log` — 1.3 KB
- `dev-server.log` — 5 KB (well under 10 MiB rotation threshold)
- `cleanup.log` — 0.6 KB, last fired 13:21:05 on boot, next fire scheduled 14:21:05

## 6. Smoke probe — all routes return 200

```
/             200
/audit        200
/change       200
/tools        200
/tools/new    200
/feasibility  200
/search       200
/settings     200
```

(Vite serves the same SPA index on every path, but the chunk loads correctly for each — verified by tailing the HMR log to confirm each lazy chunk resolves without 404s.)

## 7. Known deferred items going into Round 2

These are intentionally not gated by Round 1 — they belong to Round 2 (manual review) or Round 3 (functional sweep):

- No component-level (RTL) unit tests yet — visual regression in Round 3 will cover what matters.
- No `knip` / `depcheck` / `ts-prune` run yet — deferred to Round 3.
- No Lighthouse / a11y axe scan yet — a11y agent in Round 2 substitutes for the structural pass.
- No security CSP / SRI audit yet — security agent in Round 2 covers the seam analysis.

## Verdict

**Round 1 status: GREEN.** All deterministic gates pass. Moving to Round 2 (4 parallel review agents).
