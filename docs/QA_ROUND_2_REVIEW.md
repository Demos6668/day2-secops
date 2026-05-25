# QA Round 2 Review — abcl-secviz

Reviewer: code-reviewer agent  
Date: 2026-05-23  
Scope: production-readiness for stakeholder demo and near-future wiring

---

## CRITICAL

None found.

---

## HIGH

### H1 — StrictMode double-mount fires the feeder tick twice on initial load

**File:** `src/components/Feeder/FeederProvider.tsx:131–149`

React 18 StrictMode mounts, unmounts, and remounts every component in development. The `useEffect` that starts the scheduler runs twice. The cleanup (`cancelled = true; clearTimeout(timer)`) correctly aborts the first mount's timer, but the `new MockSource()` inside `sourcesRef` (line 60) is constructed during the first render and shared across both mounts. Because `sourcesRef` is a `useRef`, its value persists across the remount; the second mount reuses the already-started `MockSource` instance that holds its own `active` Map state. No tick fires twice in production, but in dev the PRNG state can diverge from what unit tests expect, making deterministic reproduction of drop-events harder to debug.

**Fix:** Pass `autoStart={false}` to `<FeederProvider>` in dev/test, or move `new MockSource()` inside the `useEffect` initializer so each activation gets a fresh instance.

---

### H2 — `useDashboardFilters.setFilters` uses stale `searchString` closure in concurrent-mode

**File:** `src/hooks/useDashboardFilters.ts:86–98`

`setFilters` is a `useCallback` closed over `searchString`. If two filter toggles fire inside a single React batch (e.g., programmatic multi-filter clear followed by an immediate toggle), the second call reads the same `searchString` captured at the time the callback was created — not the URL written by the first call. The `parseFromSearch(searchString)` on line 90 will therefore base its `prev` on stale query params and silently drop one of the updates.

**Fix:** Inside `setFilters`, re-read from `window.location.search` at call time instead of closing over the hook's `searchString` snapshot: `const resolved = typeof next === "function" ? next(parseFromSearch(window.location.search)) : next;`

---

### H3 — `recentlyViewed.ts` parses localStorage without schema validation

**File:** `src/lib/recentlyViewed.ts:17–19`

`getRecentItems()` deserialises with `JSON.parse(raw) as RecentItem[]` and immediately casts. Any corrupted or tampered localStorage value (wrong field types, missing `visitedAt`, extra fields) will pass TypeScript at compile time and surface as a runtime error when consuming code accesses `.visitedAt` or `.type` later in the UI or a filter. `preferences.ts` avoids this by validating types in `parseValue`; `recentlyViewed.ts` does not.

**Fix:** Add a minimal guard after parsing: check `Array.isArray(parsed)` and that each element has `id`, `type`, and `visitedAt` string fields, returning `[]` on failure.

---

## MEDIUM

### M1 — `FeederProvider` `toolsRef` lags one render behind during `setTools` callback

**File:** `src/components/Feeder/FeederProvider.tsx:70–73, 76`

`toolsRef` is updated in a `useEffect` that runs after the render where `tools` changed. The `tick` callback (line 75) reads `toolsRef.current` to build `stateMap`. If two ticks fire close together (possible during recovery when `recoverIn` reaches 0 and a new drop starts in the same tick), the second tick's `stateMap` still contains the previous render's tool snapshot. This won't corrupt data (the `setTools` updater uses `prev` correctly), but `src.fetch` will receive a stale `priorState`, causing the MockSource recovery logic to mis-calculate the pull direction for one tick.

**Fix:** Pass `tools` directly to `tick` via a callback argument instead of relying on the ref: `const tick = useCallback(async (currentTools: Tool[]) => { … }, [toolSeeds])` and call `tick(toolsRef.current)` from the scheduler. This removes the one-render lag entirely.

---

### M2 — `ChangeManagement` uses blocking `alert()` which locks the main thread

**File:** `src/pages/ChangeManagement.tsx:74`

`handlePrune` calls `alert(...)` to report pruned snapshot count. This blocks the JS event loop and is jarring in a polished demo. It also fails under some Content Security Policy configurations that block synchronous dialogs.

**Fix:** Replace `alert(...)` with `toast(...)` from sonner, consistent with how all other user feedback is surfaced in this codebase.

---

### M3 — `useBodyScrollLock` does not guard against SSR / `document` being undefined

**File:** `src/hooks/useBodyScrollLock.ts:5–10`

The hook directly accesses `document.body.style.overflow` with no `typeof document` check. `useWireframeMode` (line 18) has this guard; `useBodyScrollLock` does not. If this hook is ever called in a test environment that does not emulate `document`, or if the project adds SSR later, it will throw.

**Fix:** Add `if (typeof document === "undefined") return;` as the first line of the `useEffect` body, matching the pattern already used in `useWireframeMode.ts`.

---

### M4 — `diffSnapshots` uses list-index as React key for diff rows

**File:** `src/pages/ChangeManagement.tsx:192`

Diff rows use `key={i}` (array index). If the diff list is re-sorted or filtered in a future iteration, React will reuse DOM nodes incorrectly. A stable key is available: `d.toolId` combined with `d.kind`.

**Fix:** Change to `key={`${d.toolId}-${d.kind}`}`.

---

### M5 — `RelationshipGraph` `ToolNode` is missing keyboard interaction

**File:** `src/components/Feasibility/RelationshipGraph.tsx:44–73`

The xyflow `ToolNode` renders a `div` with no `tabIndex`, no `role`, and no keyboard handler. A keyboard-only user navigating the Feasibility page cannot focus or inspect any node. The `Controls` component provides zoom, but node details (status, coverage %) are unreachable without pointer input.

**Fix:** Add `tabIndex={0}`, `role="button"`, an `aria-label` using `tool.solution` and coverage, and an `onKeyDown` Enter/Space handler — the same pattern already applied to `ToolTile`.

---

## LOW

### L1 — Dual keyboard handlers for `j`/`k` and `/` may conflict

**File:** `src/hooks/useKeyboardShortcuts.ts:39–55` vs `src/hooks/useGlobalShortcuts.ts:43–46`

`useKeyboardShortcuts` binds `/` for search focus; `useGlobalShortcuts` independently binds `?` for the command palette. These do not conflict today, but both add `window` listeners with no coordination. If a future page mounts both hooks, the `/` key handler in `useKeyboardShortcuts` does not suppress `useGlobalShortcuts`'s `?` handler and vice versa. Document the expected mount sites to prevent accidental double-registration.

---

### L2 — `addOverlaySeed` mutates the in-memory `overlay.seeds` array before writing

**File:** `src/lib/workspace-overlay.ts:44–48`

`overlay.seeds.push(seed)` mutates the object returned by `read()`, then calls `write(overlay)`. The project coding style mandates immutable patterns throughout. This works correctly today because `read()` always returns a fresh parse, but it contradicts the immutability rule and could cause subtle issues if `read()` is ever cached.

**Fix:** Replace with `write({ seeds: [...overlay.seeds, seed] })`.

---

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0     | pass   |
| HIGH     | 3     | warn   |
| MEDIUM   | 5     | info   |
| LOW      | 2     | note   |

**Verdict: WARNING** — H1 (StrictMode double-mount) and H2 (stale filter closure) should be resolved before the stakeholder demo; H3 (unvalidated localStorage parse) before any production wiring of real user data.
