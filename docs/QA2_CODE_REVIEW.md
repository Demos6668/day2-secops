# QA2 Code Review — IA Restructure Delta

Reviewed files: `src/types/tool.ts`, `src/lib/visibility/risk.ts`, `src/pages/Dashboard.tsx`,
`src/components/Dashboard/SecurityScoringPanel.tsx`, `src/components/Dashboard/CauseLegend.tsx`,
`src/components/Dashboard/OemSmallMultiples.tsx`, `src/components/layout/Sidebar.tsx`,
`src/pages/OemsOverview.tsx`, `src/pages/ConfigBackups.tsx`, `src/pages/VulnInsint.tsx`,
`src/pages/VulnOsint.tsx`, `src/pages/AuditChecklist.tsx`, `src/pages/AuditDocs.tsx`,
`src/pages/Sops.tsx`, `src/pages/Policies.tsx`, `src/App.tsx`,
workspace JSON files.

---

## Findings

### [HIGH] Sidebar `useEffect` does not loop, but has a one-way ratchet bug

**File:** `src/components/layout/Sidebar.tsx:149–164`

The navigation `useEffect` only ever sets groups to `true`; it never closes a group that was
manually opened by the user and then navigated away from. Combined with `initiallyOpen` being
seeded once from the mount-time location, a user who manually opens a second group and then
navigates to a route in a third group will see two groups open simultaneously. This is unlikely to
infinite-loop (the state update only adds `true` entries and `setOpenGroups` is called with a
new object reference only when something changes), but the UX contract stated in the code comment
— "open the group containing the current route on every navigation" — implicitly promises that
other groups close. Confirm whether mutual-exclusion is intended; if it is, the effect must also
set non-matching active groups to `false`.

The `useMemo` for `initiallyOpen` deliberately omits `location` from its dependency array
(suppressed with eslint-disable). This is safe as written because the `useEffect` below it
handles subsequent navigations, so there is no stale-closure bug here. Document that intent more
explicitly to prevent a future contributor from removing the eslint-disable and adding `location`
as a dep, which would re-seed the entire open-state from scratch on every navigation and cause
visible flicker.

---

### [HIGH] `insint.json` cast without Zod validation; shape change silently corrupts the page

**File:** `src/pages/VulnInsint.tsx:47`

```ts
const data = insintRaw as InsintFile;
```

Every other workspace JSON file (`tools.json`, workspace configs, frameworks) is parsed through
Zod schemas in `workspace.ts`. `insint.json` is a bare `as` cast. If the JSON gains or loses a
field (e.g., `findings.info` is present in the file but not consumed in the `totalFindings`
reducer — benign today, but if the `info` count were summed and displayed the cast would not
catch a missing field), the page silently breaks at runtime with no schema error. Apply the same
pattern used in `workspace.ts`: define a `InsintFileSchema` in `src/types/` and call
`InsintFileSchema.parse(insintRaw)` at module scope.

---

### [HIGH] Legacy audit redirect accepts `"by-framework"` as a framework slug

**File:** `src/App.tsx:88–98`

The wildcard `<Route path="/audit/:framework">` guard explicitly blocks `checklist`, `docs`, and
`by-framework` by rendering `<NotFound />`. But wouter's `Switch` evaluates routes top-to-bottom,
and the specific routes `/audit/by-framework`, `/audit/checklist`, and `/audit/docs` are declared
**above** the wildcard catch. Wouter will match those specifics first, so they never reach the
wildcard handler. The `by-framework` guard inside the wildcard is therefore dead code that cannot
be triggered, meaning navigating directly to `/audit/by-framework` will always render the `Audit`
component (correct), but the in-handler `NotFound` branch is unreachable and is misleading to
future maintainers. Remove the `by-framework` branch from the guard to match the actual routing
behavior.

---

### [MEDIUM] `SecurityScoringPanel` stale filter uses a hard-coded 24 h threshold instead of the tower SLO

**File:** `src/components/Dashboard/SecurityScoringPanel.tsx:71–73`

```ts
if (staleOnly) {
  const hoursSince = (Date.now() - new Date(t.lastSync).getTime()) / 3_600_000;
  if (hoursSince < 24) return false;
}
```

`riskScoreFor` correctly consults `workspace.freshnessSloHours[TOWER_FRESHNESS_KEY[t.tower]]`
(or `freshnessSloHoursOverride`) to compute `stalenessPenalty`. The filter in
`SecurityScoringPanel` ignores both: it always uses 24 hours regardless of tower. An Identity
Security tool with a 6-hour SLO and a 10-hour-old sync is already past SLO (and will carry a
staleness penalty in the risk score), but the "Stale > 24h" filter hides it. The filter button
label is also hard-coded to "Stale > 24h" which is inconsistent with the per-tower SLOs shown
elsewhere. Either pass `workspaceConfig` into the filter predicate and use
`workspaceConfig.freshnessSloHours[TOWER_FRESHNESS_KEY[t.tower]]`, or rename the filter to
"Stale > 24h (all towers)" to accurately describe what it does.

---

### [MEDIUM] `VITE_DAY2_OSINT_URL` defaults to `localhost:5173` and is not in `.env.example`

**File:** `src/pages/VulnOsint.tsx:7–8`

The fallback `"http://localhost:5173"` is rendered verbatim in the UI and used as the `href` for
the "Open Day2 OSINT" button. In any staging or production deployment where the variable is not
set, users will click through to localhost — a dead link that looks broken. The variable is also
absent from `.env.example`, so operators have no prompt to set it. Add
`VITE_DAY2_OSINT_URL=https://osint.example.com` to `.env.example` with a comment, and consider
rendering a disabled button with a "not configured" tooltip when the value still points to
localhost (detect with `URL.hostname === 'localhost'`).

---

### [MEDIUM] `ConfigBackups.buildMockBackups` runs every render without memoization

**File:** `src/pages/ConfigBackups.tsx:56`

```ts
const rows = buildMockBackups(tools);
```

`buildMockBackups` iterates all tools twice (one entry per tool × 2) and sorts. With the ABCL
workspace (~25 tools) this is not a performance problem today, but the pattern is inconsistent
with the rest of the codebase (`OemsOverview`, `SecurityScoringPanel`, `Dashboard` all `useMemo`
derived lists). Wrap in `useMemo(() => buildMockBackups(tools), [tools])` to match the project
pattern and prevent unnecessary re-computation on unrelated parent re-renders.

---

### [LOW] `risk.ts` reason labels use "−" prefix for the `status_bonus` kind, which actually adds to the score

**File:** `src/lib/visibility/risk.ts:93–97`

```ts
reasons.push({
  kind: "status_bonus",
  delta: statusBonus,
  label: `+${statusBonus} status bonus (${tool.status.toUpperCase()})`,
});
```

The label correctly uses `+` here. However, `RiskReasonKind` names this `"status_bonus"`, and
the total is `visibilityDeficit + causePenalty + stalenessPenalty + statusBonus` — the bonus
inflates the risk score (higher = worse). The label says "bonus" which is confusing; consumers
will see "+20 status bonus (RED)" and assume it is a positive thing for the tool. Rename to
`"status_penalty"` and update the label to "status penalty" to make it clear that RED status
adds to the risk weight.

---

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0     | pass   |
| HIGH     | 3     | warn   |
| MEDIUM   | 3     | info   |
| LOW      | 1     | note   |

**Verdict: WARNING** — 3 HIGH issues should be resolved before merge. The Zod-bypass on
`insint.json` is the most likely to cause a silent runtime break when the real data integration
lands. The redirect dead-code and sidebar ratchet are lower urgency but will confuse the next
person to touch those files.
