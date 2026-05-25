# Design Research — Tower View Declutter

The tower view's job is a 1-second glance: *which tools are degraded right now?* Today's `ToolTile` carries ~11 visual elements (72px ring, OEM name, hosting icon+label, RagBadge, severity pill, observed/denominator, sync time, 2 cause flags, "+N more", RAG stripe). Too many anchor points per row.

## 7 production patterns — steal / reject

**1. Linear — issue rows.** ~32px rows, left-edge priority dot, ID + title, optional properties mid-row, assignee+date right-flushed. Density via Display Options that *remove* properties.
- **Steal:** one row = one line; status as 2px left stripe + single chip; truncated title beats wrapped metadata.
- **Reject:** Linear has no numeric KPI per row. We must keep visibility %.

**2. Vercel Geist Table.** Tabular-nums on numeric cols, sortable headers, background-only hover.
- **Steal:** tabular numerals for visibility %; sortable header; bg-tint hover (no transform).
- **Reject:** flat table loses RAG-stripe affordance — SOC operators need a color column to saccade down.

**3. Datadog — APM Service List.** Service name + env, then user-configurable metric columns (p50/p95/error rate). Click row → drawer.
- **Steal:** column-chooser pushes secondary data off the row; row-click opens drawer in-place.
- **Reject:** the 5-numbers wall — we have one KPI, not five.

**4. Sentry — Issue Triage.** Two-line rows: title + culprit on top, chip + counts + last-seen + assignee below.
- **Steal:** two-line max; "last seen" right-flushed muted; cause flags belong *below* title.
- **Reject:** per-row sparkline. Day2 has no per-tool history stream; visibility number is truer.

**5. GitHub Security alerts.** Severity = right-edge column. Sort defaults to severity desc.
- **Steal:** severity pill as a right-edge column.
- **Reject:** all-text layout — no color stripe means no fast sweep. We have RAG; use it.

**6. Stripe Dashboard — payment rows.** ~36px rows, status pill + amount (tabular), method glyph only. No avatars.
- **Steal:** at most one inline icon (hosting), monospaced numeric, subtle bg-tint hover.
- **Reject:** filter-driven triage — operators need worst-first sort by default.

**7. Splunk Observability — service instances.** Sortable RED columns, row-click opens charts in-place. Explicit top-100 cap.
- **Steal:** explicit row cap with "+N more" overflow; drawer opens inline.
- **Reject:** four-metric header — we have one metric per tile.

---

## Recommended: **Linear-row spine + GitHub right-edge severity + tooltip-on-demand**

Replace the card-style `ToolTile` with a **single 40px dense row** inside `TowerPillar`:

```
[2px RAG stripe] [24px OEM logo] [solution]·[oem dim]   [▮▮▯ 78%]  [CRIT]  [⓵2]  [2m]
                                                        visibility   sev    cause  sync
```

### Row spec

| Slot | Width | Content | Notes |
|---|---|---|---|
| RAG stripe | 2px | red/amber/green | left edge, full row height |
| OEM logo | 24×24 | real PNG | replaces 72px CoverageRing |
| Title block | flex | `solution` + dim `· oem` | 13px / 11px, single line, ellipsis |
| Visibility | 88px | 4px bar + `78%` tabular | bar tint = RAG color |
| Severity | 56px | text chip `CRIT/MOD/LOW` | RAG-color text, no fill |
| Causes | 28px | icon + count badge `2` | hover → tooltip lists names |
| Sync | 56px | `2m` muted, tabular | right-edge |

**Row height: 40px. One line. No wrap.**

### What moves where

- **Hover tooltip:** hosting type label, full cause-flag names, absolute sync time, observed/denominator absolute counts.
- **Drawer (existing `ToolDrawer`):** large CoverageRing (only place it appears), full cause list, history.
- **Killed:** in-list 72px CoverageRing, "+N more" text (count badge handles it), inline observed/denominator long form, duplicate `RagBadge` next to the stripe.

### Pillar header
Keep red/amber/green count chips and collapse-on-all-green. **Drop** the `N tools · X.X% visible` subline — the count chips already say it.

### Density math
Current tile: ~120px × 1-col. New row: 40px × 1-col = **3× more tools visible** without scrolling. A 12-tool tower fits in ~520px vs. ~1500px today.

### Motion
Hover: 80ms background tint to `bg-white/[0.03]`. No scale, no shadow. Honors L4 (color+icon+label) and the no-flash rule.

Sources: [Geist Table](https://vercel.com/geist/table), [Linear Display Options](https://linear.app/docs/display-options), [Datadog Service Page](https://docs.datadoghq.com/tracing/services/service_page/), [Sentry Issue Details UI](https://sentry.io/changelog/new-issue-details-ui-now-available/), [GitHub code scanning alerts](https://docs.github.com/en/code-security/concepts/code-scanning/about-code-scanning-alerts), [Stripe Dashboard basics](https://docs.stripe.com/dashboard/basics), [Splunk APM service view](https://help.splunk.com/en/splunk-observability-cloud/monitor-application-performance/manage-services-spans-and-traces-in-splunk-apm/use-the-service-view-for-a-complete-view-of-your-service-health).
