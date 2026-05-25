# Day2 SecOps — Design Principles

A short reference of the rules we apply to every screen. Two themes drive almost everything: **don't fatigue the operator** and **arrange the page so the worst thing is found first**.

## 1. Notification fatigue — enforceable rules

Sources: NIST SP 800-92 §4 (event correlation), Splunk SOC alert-tuning guidance, Datadog alerting playbook, Stephen Few's *Information Dashboard Design* on signal-to-noise, and the SANS "alert fatigue" body of work (M. van der Knaap et al, 2019-2022).

| Rule | What it means in code |
|---|---|
| **R1. Toast budget** | At most 3 toasts per 30-second window per severity tier. Excess events collapse into one "+N more" toast that opens the NotificationCenter on click. |
| **R2. De-duplicate** | Same tool × same status change within 60 s collapses to a single notification. Burst noise from one tool doesn't bury everything else. |
| **R3. Severity-gated toasts** | Only **RAG flips on Critical tools** and **new High-weight causes on Critical tools** ever fire toasts. Everything else routes to the NotificationCenter inbox silently. |
| **R4. Quiet hours** | Settings page exposes a global "silence Low/Moderate toasts" switch. The inbox still records; the user just stops being interrupted. |
| **R5. Never silently drop** | Anything suppressed by R1-R4 still lands in the NotificationCenter inbox with a timestamp. The toast layer hides noise; the inbox doesn't. |
| **R6. Recovery is news too, but soft** | When a tool flips back to green, the bell pulses (small visual) but no toast fires. Reduces the "alert → all-clear → alert" whiplash that drives ack-blindness. |

If a rule would prevent a critical action (e.g. a Critical tool just went red and we'd suppress it because the budget is exhausted), the rule loses. Critical-on-Critical bypasses all budgets.

## 2. Element arrangement for visibility

Sources: Stephen Few's *Information Dashboard Design* ch. 4, Edward Tufte's data-ink ratio, F/Z reading-pattern eye-tracking studies (Nielsen Norman Group, 2017-2024), Gestalt proximity / similarity.

| Rule | What it means in code |
|---|---|
| **L1. Worst thing first** | Within each tower pillar, tiles sort by RAG status (red → amber → green), then by severity (Critical → Moderate → Low). The eye lands on the most important thing without scanning. |
| **L2. Estate-at-risk strip** | A persistent strip above the four pillars surfaces every red tool in the workspace, with the highest-severity item on the left (F-pattern primary entry). Even when 0 reds, the strip stays — its "all clear" state is itself information. |
| **L3. Collapse all-green pillars** | A pillar with no red or amber tools collapses to a single-line summary by default. Vertical space is not free. Click expands. |
| **L4. Color is never alone** | Every RAG cue pairs color with a Lucide icon *and* a text label (CheckCircle2 / AlertTriangle / OctagonAlert). Operators with color-vision differences and printed reports both work. |
| **L5. Five-second glance** | Top strip answers four questions: total assets tracked, overall visibility %, red/amber/green counts, active workspace. Anything more goes in the body. |
| **L6. Density gradient** | Critical-tier elements (estate-at-risk, top strip) use larger type, more whitespace, sharper contrast. Lower-tier elements (inventory table) are denser. Hierarchy comes from size + spacing, not just color. |
| **L7. Tabular numbers** | Every count or percentage uses the `text-num` class (Fira Code, tabular-nums). Columns of numbers line up vertically so the eye scans deltas without re-anchoring. |

## 3. What we deliberately reject

- **Generic "tool health %" badges.** Visibility is the signal, not uptime.
- **Sticky toasts** for anything below Critical. They become wallpaper.
- **Donut charts in pillars** — they hide the worst tile inside an aggregate. Tiles are the unit; rings live on individual tiles, not as a roll-up.
- **"All clear" auto-dismissed banners** — they teach the operator that the dashboard talks to itself.
- **Animation on every state change.** The estate-at-risk strip and the bell pulse are the only motion budget items. Everything else is static.

## 4. Implementation pointers

- Toast budget + dedup logic: `src/lib/notifications/budget.ts`
- NotificationCenter (Slack-style bell): `src/components/NotificationCenter/`
- L1 sort + L2 strip + L3 collapse: `src/components/Dashboard/TowerPillar.tsx`, `src/components/Dashboard/EstateAtRisk.tsx`
- L4 enforcement: `src/components/Common/RagBadge.tsx` (icon + label ARE the contract, color is decoration)
- L7: `.text-num` utility in `src/index.css`

When in doubt, optimize for the question: *"Of the assets each security tool is supposed to see, how many is it actually seeing — and what is the cause of the gap?"* — that is the only job the dashboard exists to answer. Every element either helps answer it or earns its keep some other way.
