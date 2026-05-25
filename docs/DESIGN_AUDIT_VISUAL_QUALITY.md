# Visual Quality Audit — Day2 SecOps Frontend

Senior product-design pass. Focused on the OEM strip complaint and the visual debt nearest to it. Scope: dashboard + every screen that renders an OEM identity.

## 1. Root cause of the OEM strip complaint

It is **all four — but the monogram is the load-bearing problem**. At `OemSmallMultiples.tsx:82` we render `<OemMark size={22}>`, which forces `OemMark.tsx:24`'s `fontSize: Math.max(8, size * 0.42)` down to ~9 px. For 11 of the 16 OEMs in `oem-marks.ts:25` we then show two-letter codes like `CA`, `IM`, `TX`, `S1` — letter pairs that read as initials of *people*, not products, and that collide visually (CA/CS, IM/GS, TM/TX) once eight of them sit in a 6-column grid. The colors compound the problem: TrendMicro `#D71921`, Trellix `#C8102E`, CrowdStrike `#FA2A23` and CyberArk `#FF0033` are within ~10° of each other on the hue wheel, so the strip reads as a "wall of red squares with cryptic letters." The mini-tile layout is fine; the strip is doing the right job structurally. The mark itself is the cheap-looking part — it leaks "missing assets / placeholder" energy into an otherwise tight dashboard.

## 2. Recommended fix for the OEM mark

**Pick (d) — Hybrid `simple-icons` + hand-curated SVG, with (c) as a graceful fallback.**

`simple-icons` ships real wordless glyphs for ~3,300 brands with permissive SVG and known-correct hex values; it already covers Cloudflare, Okta, CrowdStrike, Symantec, and Cisco out of the box (the entire "Demo" half of the catalog). For the ABCL half — CyberArk, Imperva, TrendMicro, Trellix, Forcepoint, Forescout, Indusface, GlobalScape, TCPWAVE, Guardicore, SentinelOne — most are *not* in simple-icons and several have aggressive brand guidelines (CyberArk especially restricts logo use in third-party UI; Imperva and TrendMicro require trademark attribution). The safe play is: ship simple-icons glyphs where they exist, ship a small hand-curated SVG set (geometric mark only, no wordmark, monochrome-on-brand-color tile) for the 8-10 vendors that aren't covered, and keep today's monogram as the third-tier fallback for anything unmapped. Render at `size={28}` minimum in the strip — 22 px is below the legibility floor for any mark with internal detail.

## 3. Top 5 adjacent visual quality issues

1. **Cause flag badges read as decoration, not action.** `CauseFlagBadge.tsx:38-49` — pill is `text-[10px]` with a 12 px icon and a thin border at ~35% alpha; on `ToolTile` it sits next to a same-size SEVERITY pill and a same-size mono count, so three competing chip styles share one row with no hierarchy. **Fix:** drop the bg-tint on cause chips, keep only the icon + label in muted-foreground, and let weight color live in the icon stroke only — severity stays the only saturated pill on the tile.
2. **Severity pill text is one notch too cool on amber.** `ToolTile.tsx:20-22` — `Moderate` uses `text-[#FBBF24]` over `bg-[#D97706]/10`; the warmer `--rag-amber-text: #F59E0B` is already in `index.css:62` for exactly this case but isn't used. **Fix:** swap to `var(--rag-amber-text)`, matching the audited contrast pair documented in CSS.
3. **Loading states look broken, not loading.** `AdminOverview.tsx:159` and `AdminWebhook.tsx:62` show literal italic `"Loading..."` text in muted-foreground. We already ship `components/ui/skeleton.tsx` and use it nowhere in product code. **Fix:** replace both with 3-4 row Skeleton placeholders sized to the final list row — receivers and webhooks have stable row geometry, so this is free.
4. **Empty state looks like a dead screen.** `EmptyState.tsx:24-30` — a dashed border, 60%-opacity icon, and 80 px of vertical padding read as "404 / blocked" rather than "all clear." For Day2 SecOps specifically the empty state is good news. **Fix:** drop the dashed border, replace with a subtle `bg-gradient-to-b` over `hairline`, and use the brand-teal at 40% on the icon so the screen reads as a deliberate rest, not an error.
5. **Spacing rhythm fragments across hero strips.** `ToolDetail.tsx:81` uses `p-4 flex items-center gap-4`, `OemDetail.tsx:69` uses `p-4 flex items-center gap-5`, and `AdminOverview.tsx:124` uses `py-2 ... gap-3`. Three near-identical brand+meta strips with three different gap values. **Fix:** pull a `.hero-strip` utility in `index.css` (one of `p-4`, `gap-4`, `items-center`) and apply it to all three — typography pairing (Outfit + Fira Code) is fine, but the inconsistent rhythm is what makes it *feel* like more than one product.

Honorable mentions: DemoWatermark `#D97706` on `#D97706/10` reads cheap next to the severity pills because it shares their exact alpha recipe — give it its own visual register (outlined Outfit caps, no fill). Bell badge `-top-0.5 -right-0.5` overlaps the bell icon glyph at small sizes; nudge to `-top-1 -right-1`.

## 4. Top 3 concrete changes to ship NOW

In priority order, each is < 30 LoC and produces a visible quality jump:

1. **Install `simple-icons` and rewrite `OemMark.tsx` to render an `<svg>` when the vendor has a glyph, falling back to the monogram.** Bump the call-site in `OemSmallMultiples.tsx:82` from `size={22}` to `size={28}` and add a thin `ring-1 ring-white/10`. This alone resolves the user's complaint and lifts the dashboard's brand register two notches. (~25 LoC + one dependency.)
2. **Replace the two `"Loading..."` italics in `AdminOverview.tsx:159` and `AdminWebhook.tsx:62` with `<Skeleton>` rows.** Reuses an already-installed shadcn component, makes the admin surface feel responsive instead of stalled. (~12 LoC each.)
3. **Reduce the chip-style competition on `ToolTile`.** Demote cause flags to icon+label (no bg-tint, no border) per issue #1, and swap the severity amber to `--rag-amber-text` per issue #2. The tile gains a clean visual hierarchy — one saturated severity pill, then quiet semantic cause icons, then mono metadata — without losing any information. (~15 LoC across `CauseFlagBadge.tsx` and `ToolTile.tsx`.)
