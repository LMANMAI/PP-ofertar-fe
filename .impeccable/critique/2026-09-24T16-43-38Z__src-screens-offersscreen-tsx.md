---
target: offersscreen
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\OffersScreen.tsx"
target_fingerprint: "sha256:7cd69938b5a8ce51e1bd4d6495063cfb5ab08c56ab4a45bb2fb4b92bf89eda62"
target_path: "D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\OffersScreen.tsx"
timestamp: 2026-09-24T16-43-38Z
slug: src-screens-offersscreen-tsx
---
Method: dual-agent (A: design review, B: detector + browser evidence)

# Critique: OffersScreen

Detector: 1 advisory (design-system-color, OffersScreen.tsx:598 #64748B); OffersFilterSheet clean. Web/CSS-oriented; weak evidence otherwise. Browser evidence: dark theme, 375x812, read-only on the user's logged-in tab; filter sheet and loading/empty/error states judged from code only.

## Design Health Score: 21/40 - Acceptable (52%)
1:2 2:3 3:3 4:2 5:3 6:2 7:1 8:2 9:2 10:1

## Cognitive load
High: 4 of 8 failures (single focus, visual hierarchy, working memory, progressive disclosure).

## Design Specificity Verdict
Generic discount feed: the only personalization is the favorite-chains filter; ordered by percentage, unrelated to the user's basket; near-duplicate textile items in a grocery app.

## Priority Issues
- [P1] No basket personalization: no "De tu compra" tag or basket-first ordering (Home has both; OffersScreen has no inBasket/recurring logic - verified). Command: shape.
- [P2] No orientation: no active-filter summary, no count, no sort; chips 33px tall. Command: layout.
- [P2] Accessibility below Home: cards and chips are role-less divs, no headings/lists, no selected state on chips, lang=en. Command: harden.
- [P2] Trust: catalog offers show no validity date; 70-89% at 27px bold with no list-price source; Textil in a grocery app. Command: clarify.
- [P3] Loading/error/end states: bare spinner, raw error text without retry, silent load-more failure, no end-of-list. Command: polish.

## Persona red flags
Jordan: slippers in a grocery app; HASTA unexplained. Casey: 33px chips at the top, 198px cards. Sam: no roles/labels/headings, hardcoded #64748B. Marta: wants cheapest weekly total; no expiry dates.

## Minor
Card and chip borders 1.44-1.55:1; shadow invisible in dark; only page 1 (pageSize=50, ~20 items) fetched; logos 12-30x oversized; /points 404s from app shell.

## Questions
Why the same list as any supermarket app? What if the first card were the biggest saving for this user? Should an unsourced 89% render at 27px bold in an honest-receipt system?
