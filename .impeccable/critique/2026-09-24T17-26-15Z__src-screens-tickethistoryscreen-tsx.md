---
target: tickethistoryscreen
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\TicketHistoryScreen.tsx"
target_fingerprint: "sha256:543887d9a11e8010e84a2661439304977d8470b6cdafa98922a94cd9707e121d"
target_path: "D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\TicketHistoryScreen.tsx"
timestamp: 2026-09-24T17-26-15Z
slug: src-screens-tickethistoryscreen-tsx
---
Method: dual-agent (A: design review, B: detector + browser evidence)

# Critique: TicketHistoryScreen

Detector: exit 0, 0 findings (web/CSS-oriented; weak evidence). Browser evidence: dark theme, 375x812, read-only, 2 tickets; light theme and empty/loading/error/pending/failed states judged from code.

## Design Health Score: 21/40 - Acceptable (52%)
1:3 2:3 3:2 4:2 5:2 6:2 7:1 8:3 9:1 10:2

## Cognitive load
Moderate-high: 4 of 8 failures.

## Design Specificity Verdict
Generic list; does not express what the app learns from tickets (no recurring products, last-paid, per-store or monthly grouping).

## Priority Issues
- [P1] Summary tiles: undefined scope (all loaded tickets) that contradicts Home's "Ahorrado este mes"; "descuentos" vs "ahorrado"; "1 tickets" plural; tile lost in dark mode; 18px/11px/10px type. Commands: clarify, layout.
- [P1] Failed/pending rows show fabricated "$0" and "0 productos" (formatCurrency(null)), tappable failed row with no retry/rescan, "Falló" in fixed coral 10px, pending row opacity .75 with no a11y state. Command: harden.
- [P1] Error banner without retry and raw message; empty state without action button. Command: onboard.
- [P2] Row: blank badge for unnamed tickets, date wraps to 2 lines without year, "OK" on every row, no chevron, no grouping/search/filter/delete/rename. Commands: shape, polish.
- [P2] Accessibility: row accessibilityLabel overrides all content, "Ticket sin nombre" announced as "comercio sin nombre", green text ~2.3:1 in light, back 32x32, lang=en. Command: harden.
- [P3] Back chevron on a tab root (other tabs use the logo). Command: adapt.

## Persona red flags
Jordan: blank badge, OK everywhere, AHORRADO vs Home. Casey: no completion signal, 2-line date, tiny text. Sam: label loses content, green fails in light. Marta: wants month-over-month and per-chain trends.

## Minor
Dark text contrast >=5.9:1; row borders 1.44-1.55:1; no skeleton or pull-to-refresh; tickets 2 minutes apart look like test data.

## Questions
Why does history not show what the app learned? Should AHORRADO differ from Home for the same period? Should a failed ticket ever show $0?
