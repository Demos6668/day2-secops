# RAG Model — Loss of Asset Visibility

> **Single source of truth** for how `abcl-secviz` decides whether a security tool's tile is green, amber, or red. The implementation lives at `src/lib/visibility/score.ts`, the cause taxonomy at `src/lib/visibility/causes.ts`, and the color tokens at `src/lib/rag-tokens.ts`. Unit tests live at `src/lib/visibility/__tests__/score.test.ts`.

The RAG signal is **NOT** generic tool uptime. It is the answer to the question:

> Of the assets each security tool is supposed to see, how many is it actually seeing — and what is the cause of the gap?

---

## 1. Score formula

```
visibility_pct  = observed / denominator                                    (clamped 0..1)
severity_weight = { Critical: 1.5, Moderate: 1.0, Low: 0.7 }
gap_penalty     = (1 - visibility_pct) * 100 * severity_weight[tool.severity]
cause_penalty   = Σ CAUSE_WEIGHT_NUMERIC[cause.weight] for cause in active_causes
score           = clamp(0, 100, 100 - gap_penalty - cause_penalty)

status default:
  score >= 90              → green
  70 <= score < 90         → amber
  score < 70               → red

hard overrides (Critical tools only):
  any High-weight cause active           → red
  visibility_pct < 0.85                  → red
```

Cause weight numeric mapping (`src/lib/rag-tokens.ts`):

| Weight class | Penalty |
|---|---|
| High   | 12 |
| Medium | 6  |
| Low    | 2  |

---

## 2. Cause taxonomy (locked-in Phase 1)

| Flag | Meaning | Weight | Forces red on Critical? |
|---|---|---|---|
| `agent_absent` | Asset in CMDB but no agent enrolled | High | ✓ |
| `agent_silent` | Enrolled but no heartbeat within SLA window | High | ✓ |
| `coverage_gap` | Tool denominator > deployed seats / licenses | High | ✓ |
| `telemetry_blocked` | Agent up, logs not reaching collector (proxy / cert / network) | High | ✓ |
| `policy_drift` | Reporting but on stale policy / monitor-only mode | Medium | — |
| `stale_data` | Last sync beyond freshness SLO | Medium | — |
| `eol_unsupported` | OS or agent version unsupported | Medium | — |
| `decommission_ghost` | Asset retired but still counted in denominator | Low | — |

**Per-tower freshness SLO** (drives `stale_data` activation; override per tool with `freshnessSloHoursOverride`):

| Tower | SLO |
|---|---|
| Identity | 6 h |
| Datacenter | 12 h |
| Endpoint | 24 h |

### Framework validation

The taxonomy maps onto the asset-visibility controls in the frameworks the audit module covers:

| Cause | CIS v8.1 | NIST CSF 2.0 | ISO 27001:2022 | RBI CSF | SEBI CSCRF |
|---|---|---|---|---|---|
| `agent_absent` | 1.1, 2.1, 10.1 | ID.AM-01, ID.AM-02 | A.5.9, A.8.1, A.8.7 | RBI-1 | ID.AM |
| `agent_silent` | 8.2, 13.1 | DE.CM-01, DE.CM-09 | A.8.15, A.8.16 | RBI-10 | DE.CM |
| `coverage_gap` | 1.1, 2.1 | ID.AM-01 | A.5.9 | RBI-1 | ID.AM |
| `policy_drift` | 4.1, 4.3 | PR.PS-01 | A.8.9 | RBI-4 | PR.IP |
| `telemetry_blocked` | 8.2, 13.1 | DE.CM-01 | A.8.16 | RBI-10 | DE.CM |
| `stale_data` | 8.5 | DE.CM-01 | A.8.16 | RBI-10 | DE.CM |
| `eol_unsupported` | 2.2, 7.1 | ID.RA-02, PR.PS-02 | A.8.8, A.8.32 | RBI-4 | PR.IP |
| `decommission_ghost` | 1.4, 1.5 | ID.AM-08 | A.5.9, A.8.13 | RBI-1 | ID.AM |

No causes from frameworks are missing from the taxonomy. If new ones emerge from real ops experience, append them here and to `causes.ts` together — they must always ship as a pair.

### `decommission_ghost` decision (Phase 1)

The brief asked whether `decommission_ghost` should count against the score. **It counts at Low weight (penalty = 2 per active flag).** Rationale: retired assets that linger in the denominator silently inflate the gap and mask real coverage loss; treating it as purely informational lets the metric lie. Low weight reflects that it is more of a CMDB hygiene smell than a security visibility loss.

---

## 3. RAG color palette — WCAG verification

**Decision (Phase 1):** dedicated RAG palette, decoupled from severity tokens. Verified against the card background `#161B22`. The brief's initial proposal (`#1B873F` / `#D97706` / `#B91C1C`) was tested and partially rejected on contrast grounds — see below.

### Method

Standard WCAG 2.1 relative-luminance formula:

```
For each channel C: c = C/255
  if c <= 0.03928:  c' = c / 12.92
  else:             c' = ((c + 0.055) / 1.055) ^ 2.4
L = 0.2126 * R' + 0.7152 * G' + 0.0722 * B'

Contrast = (L_lighter + 0.05) / (L_darker + 0.05)
```

Background `#161B22` → `L_bg = 0.01067`.

### Results

| Color | Hex | L_fg | Contrast vs #161B22 | WCAG verdict |
|---|---|---|---|---|
| Green (proposed) | `#1B873F` | 0.179 | **3.78 : 1** | Passes non-text (3:1) only — too low for text use. Rejected. |
| **Green (chosen)** | **`#22C55E`** | 0.411 | **7.59 : 1** | **Passes AAA** (≥7:1). |
| Amber (proposed = chosen) | `#D97706` | 0.280 | **5.43 : 1** | Passes AA (≥4.5:1). |
| Red (proposed) | `#B91C1C` | 0.112 | **2.68 : 1** | **Fails** even non-text 3:1. Rejected. |
| **Red (chosen)** | **`#EF4444`** | 0.229 | **4.60 : 1** | **Passes AA** (≥4.5:1). |

**Final palette:**

| Status | Hex | Lucide icon | Contrast vs `#161B22` |
|---|---|---|---|
| Green | `#22C55E` | `CheckCircle2` | 7.59 : 1 (AAA) |
| Amber | `#D97706` | `AlertTriangle` | 5.43 : 1 (AA) |
| Red   | `#EF4444` | `OctagonAlert` | 4.60 : 1 (AA) |

All three values are research-driven (Tailwind 500/700-band, widely vetted). They are NOT default-bright primaries like `#00FF00` / `#FF0000`. See `src/lib/rag-tokens.ts` for icon pairings and the a11y rule that **RAG must never be color-only** — the icon and a text label always travel together, enforced by `RagBadge`.

### Light-mode override

Light mode uses darker shades (`#15803D` / `#B45309` / `#B91C1C`) because the card background in light mode is `#FFFFFF`. Re-verification of light-mode contrast is deferred to whenever light mode actually ships (currently dark is the default and only fully tested mode).

---

## 4. What to change if the model is wrong

1. Append the new cause to `src/lib/visibility/causes.ts` AND the table in §2 of this document.
2. If you change a weight class, update `CAUSE_WEIGHT_NUMERIC` in `src/lib/rag-tokens.ts`.
3. If you change a threshold, update `RAG_THRESHOLDS` in `src/lib/rag-tokens.ts`.
4. Run `pnpm test src/lib/visibility` — every formula change must be backed by a passing test.
5. Document the rationale here. Don't change the model silently.
