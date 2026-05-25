# QA Round 2 — Accessibility Audit

**Date:** 2026-05-23  
**Scope:** abcl-secviz React 19 SPA, dark-mode default, shadcn/ui + Radix primitives  
**Standard:** WCAG 2.2 Level AA

---

## 1. RAG Status Indicators (SC 1.4.1 Use of Color)

### PASS — RagBadge base component

`src/components/Common/RagBadge.tsx` always renders an icon (`aria-hidden="true"`) plus a text label and carries `role="status"` with a full `aria-label`. The product requirement (never color-only) is correctly enforced as default.

### FAIL — ToolTile suppresses the text label

`src/components/Dashboard/ToolTile.tsx:77` calls `<RagBadge status={tool.status} showLabel={false} />`. The rendered chip is icon + color only; the label is gone. The parent card's `aria-label` (line 46) does include the status word as prose, so screen-reader users are not blocked, but sighted users who cannot distinguish hue — and the product brief — require icon+text together on the visible chip.

**Fix (line 77):** Remove `showLabel={false}` or replace with `showLabel={true}`.

### FAIL — ControlMatrix roll-up cell has no icon

`src/components/Audit/ControlMatrix.tsx:119–126` renders the per-row roll-up `<span>` with only the status word and `STATUS_TONE` color classes. No icon travels with it, breaking the color+icon+text requirement stated in the brief.

**Fix (line 119):** Destructure the matching `ICONS[row.overall]` (already defined on line 21) and render it beside the label, mirroring the cell buttons above it.

### NOTE — Contrast on colored chip backgrounds

RAG_MODEL.md documents contrast ratios for text on the raw card background `#161B22`. The actual chips use `bg-[#22C55E]/20`, `bg-[#D97706]/20`, and `bg-[#EF4444]/20` (20 % alpha). The resulting blended backgrounds are significantly lighter than `#161B22`, making the contrast of text rendered in the full-saturation hex colors (`text-[#22C55E]` etc.) materially lower than the documented 7.59/5.43/4.60:1 ratios.

Spot-check (approximate, blended over `#161B22`):
- Green text `#22C55E` on `#161B22` at 20 % alpha blend ≈ `#1D2A22` → contrast drops to roughly 6.6:1. Still AA.
- Amber text `#D97706` on blended background ≈ `#272017` → contrast drops to roughly 4.1:1. **Fails AA (4.5:1 required).**
- Red text `#EF4444` on blended background ≈ `#262022` → contrast drops to roughly 3.8:1. **Fails AA.**

**Fix:** In `STATUS_TONE` (ControlMatrix.tsx:14) and `SEVERITY_PILL` (ToolTile.tsx:17), either darken the text tokens (e.g. amber → `#F59E0B`, red → `#F87171`) or reduce the opacity of the background layer to keep the blended surface close enough to `#161B22` that the documented ratios hold.

---

## 2. Keyboard Navigation (SC 2.1.1, 2.4.3, 2.4.11)

### PASS — CommandPalette (Cmd-K)

`src/components/CommandPalette/CommandPalette.tsx` delegates to Radix `CommandDialog`, which provides correct focus-trap, `role="dialog"`, `aria-modal`, and Escape-to-close. The `?` shortcut via `useGlobalShortcuts` fires the same open event.

### FAIL — Global shortcuts have no discoverability hint (SC 2.4.3 / 3.3.2)

`src/hooks/useGlobalShortcuts.ts` provides vim-style `g+letter` chords that fire navigation without any on-screen affordance or announcement. Users relying on keyboard navigation who have not read documentation will not know the shortcuts exist. The `?` key opens the palette, which also does not list the `g+letter` chords.

**Fix (useGlobalShortcuts.ts or CommandPalette.tsx):** Add a "Shortcuts" `CommandGroup` that lists each `g+letter` binding so it surfaces when the palette is open.

### FAIL — ScoreBreakdownDrawer returns focus to body on close (SC 2.4.3)

`src/components/Dashboard/ScoreBreakdownDrawer.tsx:23` uses Radix `Sheet`, which normally returns focus to the trigger element. However, the trigger is the `ToolTile` card (`role="button"`, `tabIndex={0}`), which is a custom div and not a native button. Radix tracks the trigger via a ref resolved at the time `Sheet` opens; because `SheetTrigger` is not used (the drawer is opened imperatively from the parent), there is no trigger ref, so focus is dumped to `document.body` on close.

**Fix:** Pass a `ref` to the activating `ToolTile` and restore focus manually in the `onOpenChange` close callback, or wrap the imperative open with Radix `SheetTrigger asChild` on the card.

### NOTE — Focus indicator on icon-only header buttons (SC 2.4.11 Focus Appearance)

`src/components/layout/Header.tsx:43–74`: all icon buttons are `h-8 w-8` (32x32 CSS px). The global `:focus-visible` rule in `index.css:180` provides a 2 px outline. This meets SC 2.4.11 (minimum bounding box area of the outline must enclose a perimeter of at least the focus indicator thickness times the perimeter of the unfocused component). No action required, but worth confirming with the browser DevTools focus outline rendered on top of the `rounded-md` clip.

---

## 3. Feasibility Graph — xyflow (SC 1.1.1, 4.1.2)

### FAIL — No keyboard alternative for the relationship graph

`src/components/Feasibility/RelationshipGraph.tsx:111` renders `<ReactFlow>` with `elementsSelectable` and `edgesFocusable={false}`. xyflow nodes receive focus via Tab only in certain configurations; edges with `edgesFocusable={false}` are never reachable by keyboard. More critically, the graph conveys structural relationship data (tower groupings, category links, coverage percentages) with no non-graphical equivalent.

**Fix:** Add a visually-hidden `<table>` or `<dl>` summary beneath the canvas — one row per node (tool name, tower, status, coverage %) and a separate list of edges. Wrap the canvas in a `<figure>` with `aria-label="Feasibility relationship graph"` and reference the summary with `aria-describedby`.

### FAIL — ToolNode color dot is the only status indicator inside the graph (SC 1.4.1)

`RelationshipGraph.tsx:54–55`: the inline `<span>` colored dot carrying RAG status has `aria-hidden` but no companion text inside the node. The node body does show `tool.tower` text and the coverage percentage, but not the status word itself.

**Fix (line 62–70):** Add a text node such as `{tool.status}` styled in the RAG color, or reuse `<RagBadge>` inside `ToolNode`.

---

## 4. Tool Wizard — AddTool (SC 1.3.1, 4.1.2, 3.3.1)

### FAIL — Step indicator is not announced to screen readers (SC 4.1.2)

`src/pages/AddTool.tsx:89–106`: the `<ol>` step indicator uses visual color and `CheckCircle2` icons for completed steps. There is no `aria-current="step"` on the active item and the icons are not `aria-hidden`, meaning screen readers will announce the SVG title text (or nothing) unpredictably.

**Fix (line 92):** Add `aria-current={i === step ? "step" : undefined}` to the active `<li>` and `aria-hidden="true"` to the `CheckCircle2` icon on line 100.

### FAIL — Field component label is not programmatically associated (SC 1.3.1, 4.1.2)

`src/pages/AddTool.tsx:281–290`: the `Field` helper renders a `<Label>` without a `htmlFor` prop and the `<Input>` / `<RadioGroup>` children have no matching `id`. The label is visually adjacent but not associated in the accessibility tree.

**Fix:** Generate a stable id per field (e.g. `id={label.toLowerCase().replace(/\s+/g, '-')}`) and pass it to both `Label htmlFor` and the input's `id`.

### FAIL — Disabled "Next" / "Add tool" button provides no explanation (SC 3.3.1)

When `canAdvance` is false the `<Button disabled>` is inert but nothing communicates which field is incomplete. `toast.error` fires only after the final submit attempt.

**Fix:** Add `aria-describedby` pointing to a visually-hidden message like "Complete all required fields to continue" that is conditionally rendered when `!canAdvance`.

---

## 5. Print Stylesheet (SC 1.4.12, general)

### PASS with caveats — `src/index.css:202–233`

The `@media print` block correctly forces white background, removes nav chrome, resets margins, and prevents cards from splitting across page breaks. Recharts fill-opacity is overridden to prevent solid-black fills.

### FAIL — RAG colors are CSS custom properties that will not survive forced-color print

The `--rag-green`, `--rag-amber`, `--rag-red` variables resolve to hex values only when the browser resolves them in screen mode. Under the browser's "black and white" or "forced colors" print mode the `color` property on `.rag-green` etc. may collapse to black text on a white chip background with no remaining contrast or distinction.

**Fix (index.css, inside `@media print`):** Explicitly set all RAG chip `color` properties to high-contrast print-safe values (e.g. `#000`) and use `border-left` line weight or pattern to preserve status distinction without color, or add print-only text suffixes "(G)", "(A)", "(R)" via CSS `::after` content on `.rag-green`, `.rag-amber`, `.rag-red`.

### FAIL — ReactFlow canvas will print as a blank rectangle

The xyflow canvas is a `<div>` with child `<canvas>` or SVG positioned absolutely. The print CSS has no rule to collapse or replace the graph with a print-friendly summary.

**Fix (index.css, inside `@media print`):** Add `.react-flow { display: none !important; }` and ensure the accessible table alternative recommended above is visible by default (it can be `.sr-only` on screen and unset in the print block).

---

## Summary Table

| ID | File:Line | SC | Severity | One-Line Fix |
|---|---|---|---|---|
| A1 | ToolTile.tsx:77 | 1.4.1 | High | Remove `showLabel={false}` from RagBadge |
| A2 | ControlMatrix.tsx:119 | 1.4.1 | High | Add `ICONS[row.overall]` icon to roll-up cell |
| A3 | ControlMatrix.tsx:14 / ToolTile.tsx:17 | 1.4.3 | High | Use higher-contrast text tokens for amber/red chips |
| A4 | useGlobalShortcuts.ts (whole file) | 2.4.3 | Medium | Expose `g+letter` chords in CommandPalette shortcut group |
| A5 | ScoreBreakdownDrawer.tsx:23 | 2.4.3 | High | Restore focus to trigger tile on drawer close |
| A6 | RelationshipGraph.tsx:111 | 1.1.1 | High | Add visually-hidden data table as keyboard alternative |
| A7 | RelationshipGraph.tsx:54 | 1.4.1 | Medium | Add status text label inside ToolNode |
| A8 | AddTool.tsx:92 | 4.1.2 | High | Add `aria-current="step"` and `aria-hidden` on step icon |
| A9 | AddTool.tsx:281 | 1.3.1 | High | Associate `Label htmlFor` with matching input `id` |
| A10 | AddTool.tsx:261 | 3.3.1 | Medium | Add `aria-describedby` error hint when Next/Submit is disabled |
| A11 | index.css:202 | 1.4.1 | Medium | Add print-safe RAG color overrides or CSS `::after` badges |
| A12 | index.css:202 | 1.1.1 | Medium | Hide ReactFlow canvas in print, show accessible table instead |
