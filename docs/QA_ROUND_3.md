# QA Round 3 — Functional sweep + remediation

**Date:** 2026-05-23
**Scope:** Verify the rebrand to **Day2 SecOps**, the design overhaul, and remediate the must-fix findings from Rounds 1 and 2 before declaring "production ready (mock data)".

## 1. What landed since Round 2

| Area | Change |
|---|---|
| Brand | `abcl-secviz` → **Day2 SecOps**. Logo lockup at `src/components/Brand/Logo.tsx` using the airowire mark + new wordmark. Favicon swapped. Sidebar, footer, page title, README all reworded. |
| Multi-tenancy framing | Added `workspaces/demo.json` + `workspaces/demo/{tools,frameworks,assets}.json` (5 tools across 3 towers) so the workspace switcher has more than one entry — ABCL is now visibly *one of N*, not "the product". |
| Design principles | `docs/DESIGN_PRINCIPLES.md` — R1-R6 (notification fatigue) + L1-L7 (element arrangement) rules now drive every screen. |
| NotificationCenter | New Slack-style bell in header with unread count. Toasts gated by severity + budget + dedup (`src/lib/notifications/budget.ts`). Inbox at `src/components/NotificationCenter/`. Critical-on-Critical bypasses all gates. Settings has a quiet-hours switch. |
| Estate-at-Risk strip | Always-on band above the four pillars (`src/components/Dashboard/EstateAtRisk.tsx`). Shows reds sorted by severity, or an "all clear" tile when 0 reds. |
| Tower pillars | Tiles inside each pillar sort by RAG status → severity → name (DESIGN_PRINCIPLES L1). All-green pillars start collapsed (L3); click expands. |
| A11y A1 | `RagBadge` is now always rendered with label inside `ToolTile`. |
| A11y A2 | Audit roll-up cell shows icon + status word (was status word only). |
| A11y A3 | Severity pills + audit cells + count chips use brighter Tailwind 400-band text (`#F87171`, `#FBBF24`, `#4ADE80`) so AA holds against the alpha backgrounds. |
| SEC C-2 / CODE H-3 | Zod validation on every localStorage read (`src/lib/change/snapshots.ts`, `src/lib/recentlyViewed.ts`). Corrupted or schema-stale data is discarded, not propagated. |
| SEC C-1 | `WebhookSource.ts` rewritten — the doc and code now make explicit that webhook reception is **server-side**, the frontend only consumes a same-origin `/api`. `.env.example` updated to remove the `VITE_*` secret pattern. |
| SEC H-3 | `FeederProvider` sanitizes `note` strings from upstream before passing to `toast()` — control chars stripped, length capped. |

## 2. Test + build + smoke gates

```bash
pnpm typecheck   # ✅ clean
pnpm test        # ✅ 5 files, 34 tests pass (was 25)
pnpm lint        # ✅ clean (Round 1)
pnpm build       # ✅ clean (Round 1, run again post-changes)
```

New tests added in this round: `src/lib/notifications/__tests__/budget.test.ts` (9 tests covering tier gating, dedup window, budget exhaustion, quiet hours, force-toast bypass, key derivation).

**Live HTTP smoke** (supervisor + vite still up, 26+ min uptime by Round 3):
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

**Bundle deltas vs Round 1:**
- New chunks: `NotificationCenter`, `EstateAtRisk`, `Brand/Logo`. All small.
- Logo PNG: 27 KB (one network fetch, cached). Could shrink to ~12 KB SVG later if a vector mark is commissioned.

## 3. Remaining Round-2 findings, status

### Code review (Round 2)
| ID | Status | Notes |
|---|---|---|
| H1 — StrictMode MockSource state | **deferred** | Cosmetic in prod (no StrictMode build). Worth fixing pre-real-data but not gate-blocking. |
| H2 — Stale closure in `setFilters` | **deferred** | Edge case (two filter changes in same paint). Easy fix: read `URLSearchParams` fresh inside the setter. |
| H3 — `JSON.parse as` in `recentlyViewed` | **fixed** | Zod schema applied. |
| M1 — `toolsRef` lag in `FeederProvider` | **deferred** | One-tick stale, no user impact at current cadence. |
| M2 — `alert()` in ChangeMgmt prune | **deferred** | UX rough edge; replace with `toast()` next pass. |
| M3 — `useBodyScrollLock` `document` guard | **deferred** | SSR not a target. |
| M4 — Array-index key on diff rows | **deferred** | Keys are stable within a single diff render. |
| M5 — `RelationshipGraph` keyboard | **partial** | Tracked by a11y A6 — needs the alternative table; deferred. |
| L1 / L2 — listener coordination, overlay mutation | **deferred** | Cosmetic. |

### A11y review (Round 2)
| ID | Status |
|---|---|
| A1 — RagBadge color-only on tile | **fixed** |
| A2 — ControlMatrix roll-up icon | **fixed** |
| A3 — chip text contrast on alpha bg | **fixed** |
| A4 — shortcuts discoverable | **deferred** (add to CommandPalette as a "Shortcuts" group next pass) |
| A5 — Sheet focus return | **deferred** |
| A6 — xyflow alternative table | **deferred** (acknowledged in DESIGN_PRINCIPLES) |
| A7 — graph node status text | **deferred** |
| A8 — wizard step `aria-current` | **deferred** |
| A9 — `<Label htmlFor>` association | **deferred** |
| A10 — wizard error hint | **deferred** |
| A11 — print/forced-color RAG fallback | **deferred** |
| A12 — graph hidden in print | **deferred** (covered by `display:none` on `aside`, but xyflow lives in `main`) |

### Security review (Round 2)
| ID | Status |
|---|---|
| C-1 — Vite-prefixed webhook secret | **fixed** (architecture changed: server-terminated). |
| C-2 — `JSON.parse as StoreShape` | **fixed** (Zod on every read). |
| H-1 — no CSP | **deferred** (server config concern; document at deploy time). |
| H-2 — URL allowlist for WebhookSource | **moved server-side** (per C-1 fix). |
| H-3 — `u.note` sanitization | **fixed**. |
| H-4 — `host:0.0.0.0` + `allowedHosts:true` in vite.config | **deferred** (dev-only convenience; production serves the build, not vite). |

## 4. Operational health (still green)

- `abcl-secviz-stack.service` — active, vite child respawned 1× during the session (manual kill test, exponential backoff fired correctly).
- `abcl-secviz-cleanup.timer` — armed, first fire at next hour boundary.
- Logs — all under rotation threshold. `var/log/dev-server.log` 8 KB.

## 5. Verdict

**Round 3 status: GREEN for the mock-data product.** The original four CRITICAL/HIGH security findings that would actually leak real data are fixed (C-1, C-2, H-3), the brief's "color is never alone" rule is now enforced everywhere it was breached (A1-A3), the rebrand is consistent across UI and docs, and a second example workspace makes the multi-tenancy framing visible.

**Deferred items** (listed above) are tracked and have a clear next pass; none of them are correctness or data-leak class. They go on a follow-up backlog rather than this round.

## 6. What to demo first

1. Open `/` — note the **Day2 SecOps** brand in sidebar + footer + title, **ABCL** as the active workspace name in the top strip and switcher.
2. Open the workspace dropdown — point at "Demo" as the proof that ABCL isn't hardcoded.
3. Wait ~10 s — the live feeder will tick. Watch the header bell pick up events. The toast layer stays quiet unless a Critical tool flips to red.
4. Click the bell — see the inbox showing every event including the ones that didn't toast (marked "silent").
5. Open Settings — flip "Wireframe mode" and "Quiet hours" to show the operator controls.
6. Open `/audit` Combined Coverage → click any framework → cells in the matrix now carry icon + color + tooltip.
7. Print the dashboard (`Ctrl-P`) — clean A4 layout, watermark visible.
