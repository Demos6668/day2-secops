# abcl-secviz

**ABCL Security Visibility Dashboard** — a dashboard of dashboards for the Aditya Birla Capital security tooling estate.

> The single most important job of this UI is to make **loss of asset visibility** legible at a glance: of the assets each security tool is *supposed* to see, how many is it *actually* seeing, and what is the cause of the gap?

**DEMO DATA — NOT PRODUCTION.** Every number rendered today is mock-fed.

---

## Status

| Phase | Status | Notes |
|---|---|---|
| 0 — Recon | ✅ done | See `CLONE_PLAN.md`. |
| 1 — Foundation | ✅ done (this commit) | Stack bootstrapped from `day2.osint`. AppShell, routes, workspace config loader, RAG model + WCAG-verified palette, seed JSON for tools/frameworks/assets. |
| 2 — Main dashboard tiles + drill-down | ⏸ next | ToolTile, CoverageRing, ScoreBreakdown drawer, filters. |
| 3 — Mock feeder | ⏸ | `FeederProvider` with simulated jitter + webhook seam. |
| 4 — Modules | ⏸ | Search (Cmd-K), Audit (5-framework control matrix), Change Mgmt (snapshot/diff), Tool plug-and-play wizard, Feasibility graph. |
| 5 — Polish | ⏸ | Empty states, keyboard nav, wireframe mode, print/export. |

---

## Quick start

```bash
cd /home/osboxes/abcl-secviz
pnpm install            # uses minimumReleaseAge for supply-chain safety
pnpm dev                # http://localhost:5174
pnpm test               # runs vitest (visibility/score unit tests pass)
pnpm typecheck          # tsc --noEmit
```

The dev server boots without any backend: the workspace JSON is statically imported from `workspaces/abcl/`.

---

## Project layout

```
abcl-secviz/
├── CLONE_PLAN.md                    # Phase 0 recon + decisions
├── RAG_MODEL.md                     # Score formula + WCAG palette math
├── README.md
├── package.json                     # single-package Vite app (not a monorepo)
├── tsconfig.json / tsconfig.base.json
├── vite.config.ts / vitest.config.ts
├── components.json                  # shadcn config (new-york style)
├── .env.example                     # webhook seam env vars
│
├── workspaces/
│   ├── abcl.json                    # workspace metadata
│   └── abcl/
│       ├── tools.json               # 12 seeded tools + category relations
│       ├── frameworks.json          # ISO 27001, NIST CSF 2.0, CIS v8.1, RBI CSF, SEBI CSCRF
│       └── assets.json              # asset denominators
│
└── src/
    ├── App.tsx                      # ThemeProvider + Router + Toaster
    ├── main.tsx
    ├── index.css                    # @theme inline tokens + RAG vars
    │
    ├── types/tool.ts                # zod schemas for Tool / Workspace / Framework
    ├── lib/
    │   ├── rag-tokens.ts            # RAG color palette + icon pairing
    │   ├── workspace.ts             # config loader (loadWorkspace, useWorkspace)
    │   ├── design-tokens.ts         # severity tokens (verbatim from day2.osint)
    │   ├── utils.ts                 # cn() + formatRelative()
    │   └── visibility/
    │       ├── causes.ts            # cause taxonomy + framework mapping
    │       ├── score.ts             # scoreVisibility(), buildTool()
    │       └── __tests__/score.test.ts
    │
    ├── hooks/                       # 10 verbatim hooks from day2.osint
    ├── components/
    │   ├── ui/                      # 55 shadcn primitives (verbatim)
    │   ├── Common/
    │   │   ├── DemoWatermark.tsx    # new — required by brief §6
    │   │   ├── RagBadge.tsx         # new — icon + text + color
    │   │   └── (10 verbatim Common components)
    │   └── layout/
    │       ├── AppLayout.tsx        # forked: drops news/workspace-switcher logic
    │       ├── Sidebar.tsx          # new nav: Dashboard/Audit/Change/Tools/Feasibility/Search/Settings
    │       ├── Header.tsx           # workspace name + Cmd-K trigger + theme toggle + watermark
    │       └── Footer.tsx           # watermark + version
    │
    └── pages/                       # one file per route in App.tsx
        ├── Dashboard.tsx            # working — renders all 12 seeded tools across 3 towers + SIEM placeholder
        ├── Audit.tsx                # Phase 4 placeholder (frameworks loaded)
        ├── ChangeManagement.tsx     # Phase 4 placeholder
        ├── ToolInventory.tsx        # working — table of all tools
        ├── ToolDetail.tsx           # Phase 2 placeholder
        ├── AddTool.tsx              # Phase 4 placeholder
        ├── Feasibility.tsx          # Phase 4 placeholder
        ├── Search.tsx               # Phase 4 placeholder
        ├── Settings.tsx             # working — theme toggle + wireframe mode
        └── NotFound.tsx
```

---

## How the RAG model works

See `RAG_MODEL.md` for the full formula, cause taxonomy with framework mapping (CIS v8.1, NIST CSF 2.0, ISO 27001:2022, RBI CSF, SEBI CSCRF), and the WCAG contrast math.

TL;DR — for every tool:

1. `visibility_pct = observed / denominator`
2. Apply severity weight (`Critical: 1.5`, `Moderate: 1.0`, `Low: 0.7`) to the gap.
3. Subtract cause penalties (High `12`, Medium `6`, Low `2`).
4. Map score → green / amber / red.
5. Hard override: any High-weight cause on a Critical tool → red.

The palette is **dedicated**, not borrowed from severity. Green `#22C55E` (AAA), Amber `#D97706` (AA), Red `#EF4444` (AA), all verified against the card bg `#161B22`. RAG is **never** color-only — icon + text label always travel with the color (enforced by `<RagBadge>`).

---

## Phase 1 acceptance checks

- [x] Dev server boots and renders the AppShell.
- [x] All 12 seeded tools render across the Identity/Datacenter/Endpoint pillars.
- [x] SIEM pillar shows as a "Coming Soon" placeholder with a no-op Connect CTA wired to a custom event.
- [x] `Tool Inventory` route shows the full inventory table.
- [x] `Settings` route toggles theme and wireframe mode.
- [x] `RagBadge` always pairs the color with an icon and label.
- [x] Footer + header watermark show "DEMO DATA — NOT PRODUCTION".
- [x] `pnpm test src/lib/visibility` covers the score formula (severity weight, cause penalty, both Critical hard overrides, clamping, zero-denominator).
- [x] Workspace name and denominators read from `workspaces/abcl.json` — zero ABCL strings hardcoded in components.

---

## Open seams for later phases

- **Webhook seam**: `WebhookSource` (Phase 3) — env vars `WEBHOOK_URL_<TOOL_ID>` / `WEBHOOK_SECRET_<TOOL_ID>` documented in `.env.example`.
- **SIEM connect**: `window` event `abcl-secviz:connect-siem` fires from the SIEM placeholder tile.
- **Command palette**: `window` event `abcl-secviz:open-command` fires from the header search button.
- **Feasibility graph**: `@xyflow/react` will be added in Phase 4 — not yet a dependency.
- **Snapshot storage**: `localStorage` in v1; consider IndexedDB or a small Express seam when retention pressure grows past one workspace.

---

## What lives in `day2.osint` and should NOT be ported

See `CLONE_PLAN.md §6` for the full reject list with one-line reasons. Highlights:

- `api-server`, `mcp-server`, the entire Drizzle + Postgres layer, Orval-generated React Query client.
- News / advisory / threat / persona / workspace-switcher domain components.
- `useWebSocket`, `useDesktopNotifications` — no realtime server in v1.
- Replit vite plugins, deploy/systemd configs, RSS aggregator.
