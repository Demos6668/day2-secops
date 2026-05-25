# QA2 Accessibility Audit — Delta Review

**Scope**: New and changed surfaces only. Audit date: 2026-05-24.
**Standard**: WCAG 2.2 Level AA.

---

## CRITICAL

### [A11Y-01] Sidebar icon-only links have no accessible name in collapsed mode
**File**: `src/components/layout/Sidebar.tsx` — `RenderItem` (collapsed branch, line 329)
**SC**: 4.1.2 Name, Role, Value (Level A)

When the sidebar collapses, group-header icons render as bare `<Link>` elements containing only an SVG icon. The Radix `<Tooltip>` wrapping them is a visual-only affordance — its `TooltipContent` is not wired to the trigger as an `aria-label` or `aria-labelledby`. Screen readers announce the link as unlabeled. Fix: add `aria-label={item.name}` directly on the `<Link>` inside `TooltipTrigger`. The same pattern applies to every collapsed `NavLeafRow` (line 407).

---

### [A11Y-02] VulnInsint `SeverityChip` uses a single letter as the visible label
**File**: `src/pages/VulnInsint.tsx` — `SeverityChip` (line 231)
**SC**: 1.1.1 Non-text Content (Level A); 1.3.3 Sensory Characteristics (Level A)

Each chip shows only the letters C, H, M, or L plus a count. The `title` attribute on the `<span>` is not read reliably by all screen reader / browser combinations and is invisible to touch-only users. The color coding in `SEVERITY_TONE` additionally conveys severity through hue alone. Fix: replace `title` with `aria-label` (e.g., `aria-label={`${severity}: ${n.toLocaleString()} findings`}`) and add a visible text alternative, or expand the label to the full word.

---

## HIGH

### [A11Y-03] AuditChecklist status pills rely on color and `text-[status]` string alone
**File**: `src/pages/AuditChecklist.tsx` — status pill (line 103)
**SC**: 1.4.1 Use of Color (Level A)

The status pill renders the raw value strings "open", "in-progress", "done" in color-coded tones. Users with low vision or color-blindness who cannot distinguish the amber/green/muted palette still get the text string, which is acceptable, but the status icon (`Circle`, `AlertCircle`, `CheckCircle2`) adjacent to each row is marked `aria-hidden="true"` (line 89). The icon is the primary at-a-glance indicator; hiding it removes a redundant non-color cue that would help. Fix: expose the icon with a concise `aria-label` like "Status: in progress" or add a visually hidden `<span>` beside it.

---

### [A11Y-04] ConfigBackups table — first and last `<th>` columns have no accessible name
**File**: `src/pages/ConfigBackups.tsx` — `<thead>` (lines 79, 86)
**SC**: 1.3.1 Info and Relationships (Level A)

Two header cells are empty `<th></th>` — the OEM mark column and the actions column. Screen readers will announce those columns' data cells without a column label. Fix: add `scope="col"` to all `<th>` elements, and give the empty ones a visually hidden label such as `<th scope="col" className="sr-only">Vendor</th>` and `<th scope="col" className="sr-only">Actions</th>`. AuditDocs has the same issue (line 87 of `AuditDocs.tsx` — actions column `<th>` is empty).

---

### [A11Y-05] SecurityScoringPanel leaderboard rows are links wrapping complex content with no descriptive label
**File**: `src/components/Dashboard/SecurityScoringPanel.tsx` — `<Link>` (line 201)
**SC**: 2.4.6 Headings and Labels (Level AA); 4.1.2 Name, Role, Value (Level A)

Each row link's accessible name is computed from all descendant text, producing announcements such as "1 [OEM mark alt?] Solution name OEM · Tower · Severity [reason lines] 142". The `RagBadge` status and the risk score tooltip (`aria-label="Risk score 142"`) are nested inside the link anchor, which is valid, but the link itself has no `aria-label` to give screen reader users a clean, scannable summary. The `OemMark` component's alt text is unknown from this diff; verify it is not empty. Fix: add `aria-label` on each `<Link>` in the same pattern used in `OemSmallMultiples` (line 77 of `OemSmallMultiples.tsx` which correctly uses `aria-label={`${a.oem} — ...`}`).

---

### [A11Y-06] VulnInsint compliance progress bars have no text alternative
**File**: `src/pages/VulnInsint.tsx` — agent groups section (lines 165–179)
**SC**: 1.1.1 Non-text Content (Level A); 4.1.3 Status Messages (Level AA)

Each agent group renders a colored `<div>` progress bar without a `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, or `aria-valuemax`. The percentage is visible as adjacent text, which partially mitigates the issue, but the bar itself conveys threshold state (green/amber/red) through color only with no programmatic representation. Fix: add `role="progressbar" aria-valuenow={g.compliancePct} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.name} compliance`}` to the outer bar container.

---

## MEDIUM

### [A11Y-07] Sidebar group button has no `aria-controls` binding
**File**: `src/components/layout/Sidebar.tsx` — `RenderItem` expanded branch (line 352)
**SC**: 4.1.2 Name, Role, Value (Level A)

`aria-expanded` is correctly toggled on the group `<button>`, but there is no `aria-controls` pointing at the child `<ul>` id. Some screen readers use this to allow jumping directly from the button to its controlled region. Fix: assign a deterministic `id` to each child `<ul>` and add `aria-controls={id}` to the button.

---

### [A11Y-08] Escape key does not close open nav groups
**File**: `src/components/layout/Sidebar.tsx`
**SC**: 2.1.1 Keyboard (Level A)

The `toggleGroup` handler is wired only to `onClick`. A keyboard user who opens a group with Enter/Space then navigates into child links has no way to collapse the group again without clicking elsewhere. Convention (and ARIA Authoring Practices for tree/disclosure patterns) expects Escape or a second Enter/Space on the button to close. Fix: add an `onKeyDown` handler that calls `toggleGroup` on Escape when focus is inside the group's child list, or ensure the button itself closes on second activation (which it does via the toggle, but focus must return to the button first — document this in the keyboard interaction model).

---

### [A11Y-09] AuditChecklist owner labels are opaque abbreviations
**File**: `src/pages/AuditChecklist.tsx` — line 99
**SC**: 3.1.4 Abbreviations (Level AAA, informational)

Owner values like "ops", "iam", "net-ops" are exposed directly as `owner · ops`. They are meaningful to the engineering team but ambiguous to a screen reader user or an external auditor. This is Level AAA and advisory only, but since this is an audit surface with compliance implications, consider expanding the label (e.g., `title="Identity and Access Management"`) or resolving abbreviations to full names in the data layer.

---

### [A11Y-10] OemsOverview inline visibility percentage uses color-only status
**File**: `src/pages/OemsOverview.tsx` — line 110
**SC**: 1.4.1 Use of Color (Level A)

The per-tool visibility percentage within each OEM card uses `style={{ color: getRagToken(t.status).hex }}` with no accessible text alternative for the color meaning. The numeric value is present, which satisfies minimum requirements, but the RAG status conveyed by the color is not surfaced to assistive technology. Fix: add `aria-label={`${t.solution}: ${pct.toFixed(0)}% visible, status ${t.status}`}` on the percentage `<span>`.

---

## LOW

### [A11Y-11] CauseLegend links have no `aria-label`; link text is the cause label only
**File**: `src/components/Dashboard/CauseLegend.tsx` — line 44
**SC**: 2.4.4 Link Purpose in Context (Level A)

Each cause card is a `<Link href="/causes/${c}">` whose computed accessible name is the concatenation of the cause label, weight modifier, and description paragraph. This is verbose but technically sufficient via context. No action required unless the `/causes/:flag` routes are added without meaningful page titles.

---

### [A11Y-12] VulnOsint external link missing visible "opens in new tab" indicator
**File**: `src/pages/VulnOsint.tsx` — line 40
**SC**: 2.4.4 Link Purpose in Context (Level A)

The "Open Day2 OSINT" button opens `target="_blank"`. The `ArrowUpRight` icon is `aria-hidden` by default (Lucide default). Users are not warned the destination opens a new tab. Fix: add `aria-label="Open Day2 OSINT (opens in a new tab)"` or append a visually hidden `<span className="sr-only">(opens in new tab)</span>`.

---

## Heading Hierarchy — All New Pages

All new pages (`VulnInsint`, `AuditChecklist`, `AuditDocs`, `ConfigBackups`, `Sops`, `Policies`, `OemsOverview`, `VulnOsint`) follow the pattern: `PageHeader` renders the page-level `<h1>` (verify in `PageHeader` implementation), and card/section headings use `<h2>` or `<h3>`. No heading levels are skipped in any file reviewed. **No action required.**

## Table Semantics — ConfigBackups, AuditDocs

Both pages use native `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>` elements. **No div-table hacks found.** The only issue is the unlabeled header cells documented in A11Y-04 above.

---

## Summary

| ID | Severity | SC | File |
|----|----------|----|------|
| A11Y-01 | CRITICAL | 4.1.2 | Sidebar.tsx |
| A11Y-02 | CRITICAL | 1.1.1, 1.3.3 | VulnInsint.tsx |
| A11Y-03 | HIGH | 1.4.1 | AuditChecklist.tsx |
| A11Y-04 | HIGH | 1.3.1 | ConfigBackups.tsx, AuditDocs.tsx |
| A11Y-05 | HIGH | 2.4.6, 4.1.2 | SecurityScoringPanel.tsx |
| A11Y-06 | HIGH | 1.1.1, 4.1.3 | VulnInsint.tsx |
| A11Y-07 | MEDIUM | 4.1.2 | Sidebar.tsx |
| A11Y-08 | MEDIUM | 2.1.1 | Sidebar.tsx |
| A11Y-09 | MEDIUM | 3.1.4 (AAA) | AuditChecklist.tsx |
| A11Y-10 | MEDIUM | 1.4.1 | OemsOverview.tsx |
| A11Y-11 | LOW | 2.4.4 | CauseLegend.tsx |
| A11Y-12 | LOW | 2.4.4 | VulnOsint.tsx |
