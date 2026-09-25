---
target: homescreen
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\HomeScreen.tsx"
target_fingerprint: "sha256:619f9bf07a974695cc75f2532b773e9e907eabe99ed206d969dfe35a76bce14f"
target_path: "D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\HomeScreen.tsx"
timestamp: 2026-09-24T16-25-12Z
slug: src-screens-homescreen-tsx
---
Method: dual-agent (A: design review, B: detector + browser evidence)

# Critique: HomeScreen

Detector: 1 advisory finding (design-system-color, HomeScreen.tsx:906 #64748B); web/CSS-oriented so otherwise weak evidence. Browser evidence is dark theme only, 375x812, read-only on the user's logged-in tab.

## Design Health Score: 23/40 - Acceptable (57%)
1:2 2:3 3:3 4:2 5:2 6:2 7:2 8:2 9:3 10:2

## Cognitive load
Moderate-high: 3-4 of 8 failures (four competing blocks, ~19 items hidden in two carousels, ~12 visible targets).

## Design Specificity Verdict
Mostly a generic offers feed with a personal strip: looks back at the month first, offers sorted by discount unrelated to the user's basket, then recurring products; the smart list (the answer to the core promise) hides behind a 12px "Mis consumos" quick action near the fold.

## Priority Issues
- [P1] isNewUser = savings != null && ticketCount === 0 uses the current month only (HomeScreen.tsx:316): on the 1st of a month or after a month without scans a long-time user gets the first-run card, which replaces the recurring products section (line 471). Verified in code. Command: harden.
- [P1] Core promise buried; offers not personal. Commands: shape, layout.
- [P2] "AHORRO DEL MES" and "-40%" do not say what they measure; the offerFor line is 10px, one line, truncated. Command: clarify.
- [P2] "Ver mis tickets" white 12px on coral 3.09:1; "Ver todas/todos" 55x15; no headings; cards without role/label; tabs without aria-selected; hardcoded #64748B (detector). Command: adapt.
- [P2] TICKETS 0 / PROM $0 shown while loading or on error; scan button navy on dark 1.07:1 and shares the receipt icon with the Tickets tab. Command: polish.
- [P3] Greeting ~105px with emoji; 9 of 10 product tiles use the same 523KB placeholder; product name has no line clamp (cards 278px). Commands: quieter, distill.

## Persona red flags
Jordan: sees offers first, zeros in savings, scan icon like Tickets tab. Casey: smart list offscreen, 15px links, ~18 hidden carousel items. Sam: no headings, unlabeled cards, no selected tab state, lang=en. Marta: wants weekly savings and where her basket is cheaper; 89% off slippers in a grocery app.

## Minor
Tablet is a capped-width phone layout; no validity dates on catalog offers; no pull-to-refresh; emoji read as "waving hand"; raw uppercase OCR names; /offers requested twice; /points/me and /points/history 404 (app shell, not Home).

## Questions
Why is the first block a look back and the second ignores the basket? 89% off slippers or "your basket costs $X here, $Y at Coto"? What does telling a returning user on the 1st that they never scanned do to trust?
