# Design Research — Dribbble + Production References

Curated patterns relevant to Day2 SecOps (52k users, 33k endpoints, 17.7k NAC, 3k servers, 800 FQDN; 12+ OEM tools, multi-workspace). Each entry: source, pattern, fit.

## Dribbble references

1. **Asset Data Visualization Dashboard** — https://dribbble.com/shots/20008810-Asset-Data-Visualization-Dashboard
   - Pattern: top KPI strip + asset-category tower columns with stacked status bars per asset class.
   - Fit: maps almost 1:1 to our Identity / Datacenter / Endpoint pillar grid; reinforces "tower per asset family, count on top, status stack below."

2. **Threat Intelligence Dashboard — Anuj Agrawal** — https://dribbble.com/shots/23085687-Threat-Intelligence-Dashboard
   - Pattern: dark canvas, severity chips as outlined rectangles (not dots), CVE table with inline trendline column.
   - Fit: the chip-not-dot treatment passes WCAG without color-only severity — exactly what we need for RAG legibility under fatigue.

3. **CyberX — Cyber Security Admin Dashboard (Asiq M.)** — https://dribbble.com/shots/23385269-CyberX-Cyber-Security-Admin-Dashboard
   - Pattern: persistent left rail + "tool switcher" secondary row, score number paired with a thin horizontal status bar.
   - Fit: validates pairing our 12 OEM detail pages behind a secondary nav row instead of growing the sidebar; the score+bar combo is a cheaper alternative to gauges on ToolDetail.

4. **Cyber Security Dark Theme (Angelo Gramatica)** — https://dribbble.com/shots/23911912-Cyber-Security-Dark-Theme
   - Pattern: muted neutral surfaces with a single saturated color reserved for *critical* only; amber/green are desaturated.
   - Fit: directly addresses "no screaming" — only red is allowed to be loud. We currently use full-saturation amber too; pulling amber back reduces RAG noise.

5. **Cyber security Dashboard UI-UX (Hiten Rajgor)** — https://dribbble.com/shots/11275634-Cyber-security-Dashboard-UI-UX
   - Pattern: a static "estate health" hero strip above the fold; below it, a 4-column tile grid with no animation.
   - Fit: confirms our "Estate at Risk" strip + pillar grid is the right shape; reinforces a no-motion rule for 14h shifts.

6. **Dark Mode Table (Attio)** — https://dribbble.com/shots/11220447-Dark-Mode-Table
   - Pattern: 32px row, severity as left-edge 2px color stripe, numeric columns right-aligned, monospace tabular numerals.
   - Fit: the 2px stripe + tabular numerals is what ToolInventory and Audit's control matrix need to scale to 50k rows without becoming a wall.

7. **Inquiries data table — Dark mode (Vinícius Ferreira)** — https://dribbble.com/shots/24549776-Inquiries-data-table-Dark-mode
   - Pattern: severity as text label inside a chip *plus* a left rail color; sticky header, filter pills above table.
   - Fit: double-encoding (label + color) is the screen-reader-safe pattern we should apply to /controls and /causes drill-downs.

8. **Fleet Management Dashboard (Nurul Amin)** — https://dribbble.com/shots/18671809-Fleet-Management-Dashboard
   - Pattern: small-multiples row — six tiny identical charts in a strip, each labeled with the entity it represents.
   - Fit: ideal for AdminOverview when summarizing 12 OEM tools side-by-side without 12 individually-styled widgets.

## Production references

9. **GitHub Security Overview** — https://docs.github.com/en/code-security/reference/security-at-scale/security-overview-dashboard-metrics
   - Pattern: severity-grouped stacked bars; top-N "worst repositories" leaderboard with per-row severity breakdown.
   - Fit: our Snapshot and Audit views need exactly this — a ranked list of worst offenders with a severity micro-stack per row instead of just totals.

10. **Vercel Dashboard "How to" guide** — https://how-to-dashboard.vercel.app/
    - Pattern: compact KPI (label + number + delta, *no* sparkline), red=bad / green=good / grey=neutral, table-as-primary-surface.
    - Fit: tells us to strip sparklines from our top stat strip and trust delta arrows; keeps the dashboard scannable in <1s.

11. **Linear Dashboards best practices** — https://linear.app/now/dashboards-best-practices
    - Pattern: density matched to view frequency; fewer dashboards, each with an explicit owner and audience.
    - Fit: prescribes a single canonical Dashboard view for shift handover and pushes everything else to ToolDetail/Audit — supports collapsing redundant tiles.

12. **Snyk Issues UI — Priority Score sorting** — https://docs.snyk.io/manage-risk/prioritize-issues-for-fixing/priority-score
    - Pattern: every row carries a numeric priority score; default sort is score-desc, severity is a secondary chip.
    - Fit: we currently sort tiles red→amber→green by color bucket only; adding a numeric "risk weight" lets two reds rank against each other on Dashboard and Snapshot.

---

## Top 5 design moves to adopt

1. **Double-encode severity everywhere** (Dashboard, ToolDetail, Audit, ToolInventory) — pair RAG color with a short text label ("CRIT/HIGH/MED/LOW") and a 2px left-edge stripe on table rows. Removes color-only failure mode and survives the SOC's blue-light filters. *(refs 2, 6, 7)*

2. **Demote amber, reserve saturation for red** (Dashboard pillar tiles, "Estate at Risk" strip) — desaturate `#D97706` for amber surfaces; keep full-strength red only for the critical state. Reduces the "everything is yellow" wash. *(ref 4)*

3. **Kill sparklines in the top stat strip, keep delta arrows** (Dashboard 4-card strip, AdminOverview) — replace each card's mini-chart with `value + Δ arrow + tabular numerals`. Frees ~25% of strip height for an extra KPI without scrolling. *(ref 10)*

4. **Add a numeric risk weight + "Worst N" leaderboard** (Snapshot, Audit, OemDetail) — compute a per-entity score (count × severity weight), sort desc, render as a 10-row leaderboard with inline severity micro-stacks. Replaces undifferentiated red-bucket sorting. *(refs 9, 12)*

5. **Small-multiples OEM strip on AdminOverview** (AdminOverview, new strip above tool grid) — 12 identical 80×40 mini-tiles, one per OEM, showing only `name + score + 1 status dot`. Click to drill into OemDetail. Replaces variable-height per-vendor cards with a uniform scan-row. *(ref 8)*

---

## Sources

- [Asset Data Visualization Dashboard](https://dribbble.com/shots/20008810-Asset-Data-Visualization-Dashboard)
- [Threat Intelligence Dashboard](https://dribbble.com/shots/23085687-Threat-Intelligence-Dashboard)
- [CyberX Admin Dashboard](https://dribbble.com/shots/23385269-CyberX-Cyber-Security-Admin-Dashboard)
- [Cyber Security Dark Theme](https://dribbble.com/shots/23911912-Cyber-Security-Dark-Theme)
- [Cyber security Dashboard UI-UX](https://dribbble.com/shots/11275634-Cyber-security-Dashboard-UI-UX)
- [Attio Dark Mode Table](https://dribbble.com/shots/11220447-Dark-Mode-Table)
- [Inquiries data table — Dark mode](https://dribbble.com/shots/24549776-Inquiries-data-table-Dark-mode)
- [Fleet Management Dashboard](https://dribbble.com/shots/18671809-Fleet-Management-Dashboard)
- [GitHub Security Overview metrics](https://docs.github.com/en/code-security/reference/security-at-scale/security-overview-dashboard-metrics)
- [Vercel Dashboard guide](https://how-to-dashboard.vercel.app/)
- [Linear Dashboards best practices](https://linear.app/now/dashboards-best-practices)
- [Snyk Priority Score](https://docs.snyk.io/manage-risk/prioritize-issues-for-fixing/priority-score)
