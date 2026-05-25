# abcl-secviz — Improvements

Opinionated upgrades for the dashboard-of-dashboards surface. Scope: clarify *where am I blind?*, not feature sprawl.

## 1. Competitor / category research

- **Panaseer (CCM).** *Coverage-as-a-percentage with a denominator drilldown* — every metric reads "X of Y assets covered by control Z"; clicking Y drops into the missing set. Our visibility% shows numerator and status but never the *missing population*.
- **Axonius.** *Threshold-colored charts with single-field time scrubbing.* Each tile should replay its history inline — fits our snapshot/diff story.
- **JupiterOne.** *Graph-first navigation backed by J1QL plus a visual query builder.* Dashboards are saved queries. Our feasibility graph is read-only; making tiles editable queries closes the loop.
- **Sevco.** *Source-of-record diff across tool inventories* — "EDR says 1,200, NAC says 1,050, here are the 150". Our 12-tool model has the same overlap and we are not surfacing it.
- **Brinqa.** *Point-and-click risk-graph exploration with saved views and snapshots as first-class objects.* Snapshots should be shareable URLs, not just diff results.

## 2. Per-OEM dashboard idioms

One signal per tile (no repeats of visibility%, RAG, severity, cause flags):

- **CyberArk MFA + PAM** — break-glass accounts checked out in last 24h; longest open privileged session.
- **Indusface AppTrana** — custom rules authored in last 24h responding to a DAST finding (their managed-rules pipeline is the differentiator).
- **Imperva WAF** — ratio of sites in *block* vs *alert-only* mode (Imperva cites 94% in block; lower is drift).
- **TrendMicro Deep Security / HIPS** — workloads still on *virtual patches* older than 30 days.
- **GlobalScape EFT / SFTP** — transfers predicted to breach SLA in the next window.
- **TCPWAVE DDI** — subnets >85% utilized + unauthorized DNS reservations vs SNMP baseline.
- **Trellix Disk Encryption** — endpoints reporting *encrypted* but with no escrowed recovery key.
- **Forcepoint DLP** — top exfil channel in last 24h (web / email / endpoint / removable media).
- **SentinelOne EDR** — Ranger-discovered *unmanaged-but-reachable* endpoints per AD domain.
- **Guardicore** — east-west flows still allowed by *default-allow* vs explicit allow.
- **Forescout NAC** — devices admitted via *exception/override* in last 24h.

## 3. Top 10 concrete improvements

1. **Inventory-delta tile.** Pairwise inventory deltas across overlapping tools (EDR vs NAC vs HIPS vs DLP). Sevco's core insight.
2. **"Silent endpoints" aggregate.** One tile counting endpoints where ≥1 of {EDR, HIPS, DLP, NAC} has not phoned home in 24h.
3. **Denominator drilldown on every visibility%.** Clicking 87% opens the 13% — exportable list with `lastSeen`. Panaseer pattern.
4. **`/diff?from=24h&to=now` on the snapshot store.** First-class shareable URL, deep-linkable from any RAG tile.
5. **Hover-card on cause flags quoting the exact framework control text.** ISO / NIST / CIS / RBI / SEBI clauses are already mapped — show the literal sentence.
6. **Score-history sparkline per tile**, hover to scrub. Reuses snapshot store.
7. **Tile-as-query.** Each tile becomes a saved query the user can clone and edit from Cmd-K.
8. **"Paid-but-unused features" panel per tool.** Ingest licensed-module list, flag modules with zero events. Reach Security pattern.
9. **Tower-pillar conflict badges.** When Identity claims "covered" but Endpoint says "no agent", surface the contradiction at the pillar header.
10. **Audit-matrix coverage diff between snapshots.** Show controls that *gained* or *lost* coverage since last evidence pull — the auditor's actual question.

## 4. Risks in the current design

- **RAG hard-override masks composition.** A single Red on `coverage_gap` flips the whole tile Red even when the gap is one noisy VLAN. Add a "dominant cause" badge so users see *why* Red.
- **`coverage_gap` weighted High is often noisy.** Mock feeders generate gap signals from stale-cache inventory mismatches, not real exposure. Add a confidence weight or min-dwell-time before promotion.
- **Mock feeder probabilities are roughly uniform.** Real telemetry is bursty and correlated — one AD outage tanks four tools at once. Add a correlated-failure mode to stress-test cross-tile logic.
- **Cmd-K palette is action-only.** It should also be a *query surface* across the 12 tools; otherwise it's a shortcut menu, not a control plane.
- **Feasibility graph is read-only and decorative.** It encodes beliefs but does not let users challenge them. Add edge-level evidence popovers tied to the snapshot store, or auditors will ignore it.

## Sources

Panaseer: <https://panaseer.com/resources/blog/how-to-analyze-and-improve-your-cybersecurity-controls-coverage> · Axonius: <https://www.axonius.com/blog/announcing-vulnerability-management-module-new-axonius-features> · JupiterOne: <https://docs.jupiterone.io/j1ql> · Sevco: <https://www.sevcosecurity.com/asset-intelligence/> · Brinqa: <https://www.brinqa.com/platform> · CyberArk: <https://docs.cyberark.com/manage/latest/en/content/sca/dpaforcloud/breakglass.htm> · Indusface: <https://www.indusface.com/blog/self-managed-rules-apptrana-feature-update-overview/> · Imperva: <https://www.imperva.com/blog/how-to-maximize-your-waf/> · TrendMicro: <https://help.deepsecurity.trendmicro.com/20_0/on-premise/protection-modules.html> · GlobalScape: <https://www.globalscape.com/managed-file-transfer/business-activity-monitoring> · TCPWave: <https://tcpwave.com/ipam/> · SentinelOne: <https://www.sentinelone.com/platform/singularity-network-discovery/> · Reach: <https://www.reach.security/product>
