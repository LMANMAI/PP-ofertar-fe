---
target: src/screens/OfferDetailScreen.tsx
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\OfferDetailScreen.tsx"
target_fingerprint: "sha256:2004556464b775eea9670abd484b19809fc3fbf96f07e5cf5f82199dd3c9633e"
target_path: "D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\OfferDetailScreen.tsx"
timestamp: 2026-09-03T16-46-29Z
slug: src-screens-offerdetailscreen-tsx
closed: true
---
Method: dual-agent (A: afcd51eaf69b03022 · B: a10390cecca99df60)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3/4 | Validity banner + staleness caveat communicate freshness honestly, but nothing signals when `activeTo` has already passed |
| 2 | Match System / Real World | 3/4 | Good es-AR/voseo grounding, but the price line buries two numbers in one sentence, unlike the app's "itemized" convention |
| 3 | User Control and Freedom | 3/4 | Clean back navigation, no dead ends |
| 4 | Consistency and Standards | 2/4 | Uses `offerBadge()`/`ScreenHeader` correctly, but ignores `offerPromo()`, the amount-tile pattern, and `formatCurrency()` entirely |
| 5 | Error Prevention | 2/4 | Every optional field is null-checked, but the `offer` prop itself is required and completely unguarded — see P1 below |
| 6 | Recognition Rather Than Recall | 2/4 | User must re-derive the deal's shape from a plain sentence instead of seeing the tile/chip they just tapped |
| 7 | Flexibility and Efficiency | 2/4 | No secondary action (compare, save, share) — plausibly deliberate, but leaves zero affordance either way |
| 8 | Aesthetic and Minimalist Design | 3/4 | Reasonably clean, but "Supermercado: X" duplicates the retailer name already shown in the hero |
| 9 | Help Recognize/Diagnose/Recover from Errors | 2/4 | No expired-offer state — a past `activeTo` still renders as "Vigente hasta el X" |
| 10 | Help and Documentation | 3/4 | "Condiciones" functions as appropriate contextual help |
| **Total** | | **25/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment:** Only partially grounded in OfertAR's identity. The surface cues are right — navy hero, `offerBadge()`, peso formatting, voseo, three genuinely product-specific honesty caveats (catalog-price staleness, OCR-percentage uncertainty, stock availability). But structurally this reads as a generic "deal detail" template: hero banner, bulleted `Label: value` list, paragraph of fine print. The one thing that would make it unmistakably *this* product — the amount-tile + "HASTA" capping + warm conditional chip that `offerPromo()`/`describePromo()` exist specifically to render, and that both `OffersScreen` and `HomeScreen`'s cards already use — is entirely absent. The screen a user lands on after tapping a specific deal is less specific to the app's own promo-honesty system than the card they tapped from.

**Deterministic scan:** `detect.mjs` actually returned real findings this time (3 `design-system-color` hits) rather than the usual `[]` — a first for this session. But cross-checked against a manual grep, it caught only 3 of the file's 5 hex-literal violations (missed an inline JSX color prop at line 63 and a same-`StyleSheet.create`-block literal at line 169), so treat it as a floor, not a complete pass. The manual sweep confirms: 5 hardcoded hex colors with no token equivalent (lines 63, 164, 169, 179, 211), 2 non-scale spacing magic numbers (18 at lines 130/171), one `-20` that should read `-space.xl` (line 170), zero dead style keys (all 19 defined keys are referenced), zero `Pressable`s in the file (so no in-file accessibility gap — a genuine clean result, not untested), and `tsc`/`eslint` both exit clean. Both assessments independently confirmed the file never imports `offerPromo`/`describePromo` from `offersApi.ts` — strong corroboration on the report's central finding.

## Overall Impression

This screen does the "plumbing" right — shared header, shared badge helper, defensive null-checks on every optional field, zero dead code — but skips the one integration that would make it *this app's* offer-detail screen instead of a generic one: it never calls the `offerPromo()`/`describePromo()` system that both sibling cards use to render the amount-tile, the capping disclosure, and the honest mechanic explanation. The user taps a card showing a bold percentage in a navy tile and lands on a screen that shows the same information as a plain sentence — the detail view under-delivers relative to the summary it came from, which inverts what a detail screen is supposed to do. Beyond that, an unguarded required prop and five untokenized colors (one a real dark-mode contrast break) round out a screen that's cleaner in code hygiene than in either genuine specificity or trust posture.

## What's Working

- **Correct badge plumbing.** Uses the shared `offerBadge()` and `ScreenHeader` rather than reimplementing them — avoids the exact drift pattern that caused real bugs elsewhere in this app.
- **Confirmed clean dead-code state.** No trace of the old "activate offer" flow remains anywhere — styles, JSX, or comments. That cleanup pass genuinely landed, and today's zero-dead-key result proves it's held.
- **Defensive against sparse data.** Every optional field (`brand`, `category`, `legalText`, `listPrice`/`price`) is null-checked via a filter chain rather than assumed present — the screen won't show "undefined" on a thin offer record.

## Priority Issues

**[P1] The screen never calls its own promo-honesty system.** `offerPromo()`/`describePromo()` from `offersApi.ts` — the amount-tile, "HASTA" capping flag, warm conditional chip, and honest-mechanic sentence both `OffersScreen`'s and `HomeScreen`'s cards already use — are never imported here. The hero just shows `offer.headline` as plain text, and the catalog price is a bare sentence. This isn't only a visual downgrade: a campaign offer with multiple advertised percentages silently loses the multi-percentage disclosure caveat the list card shows for exactly the same honesty reasons DESIGN.md exists for. Fix: call `offerPromo(offer)` in the hero and render the same tile/chip/caveat pattern the cards use. → `/impeccable layout`

**[P1] `offer` is a required prop with zero internal guard.** [OfferDetailScreen.tsx:28](PP-ofertar-fe/src/screens/OfferDetailScreen.tsx:28) calls `offerBadge(offer.retailerName)` immediately, no null check. Traced to the actual call site — `App.tsx:648` renders this screen only inside `findOffer(selectedOfferId) && (...)`, then re-calls `findOffer(selectedOfferId)!` with a non-null assertion for the prop itself. The screen has no resilience of its own; it depends entirely on a double-lookup-plus-assertion pattern in the caller that would silently break if the underlying list ever mutated between the two calls. Fix: guard inside the screen (or at minimum make the prop nullable and render a not-found state), rather than trusting the caller forever. → `/impeccable harden`

**[P1] Five hardcoded hex colors, one a real dark-mode contrast break.** `productText: { color: "#374151" }` ([:211](PP-ofertar-fe/src/screens/OfferDetailScreen.tsx:211)) sits on `contentCard`'s theme-aware background (`colors.card`, `#FFFFFF` light / `#111A2C` dark) — in dark mode this renders as dark slate on near-black, effectively unreadable. The other four (lines 63, 164, 169, 179) are inert only by coincidence (they sit on the navy hero, which happens to be identical in both palettes) with nothing in the code marking that as deliberate. Fix: route all five through theme tokens (`colors.defaultText`/`mutedText2` for the productText case). → `/impeccable colorize`

**[P2] No expired-offer state.** `until` renders unconditionally as "Vigente hasta el {date}" with no check against the current date. A stale deep link, cached list entry, or old notification still presents a dead offer as live — exactly the kind of overclaim the app's own honesty principle exists to prevent. `RecurringProductsScreen` already has the `daysUntil()` pattern this could mirror or invert. → `/impeccable harden`

**[P2] Redundant "Detalle" bullets in a generic format.** `offer.retailerName` appears three times total (hero store row, plus a `"Supermercado: ${offer.retailerName}"` bullet), adding no information. The `Label: value` string-with-colon rendering is also a visually generic downgrade from the labeled two-column `detailRow` pattern `RecurringProductsScreen` already established for the same kind of data. → `/impeccable distill`

## Persona Red Flags

**Sam (Accessibility-Dependent):** The dark-mode contrast bug makes the entire "Detalle" section (brand, category, retailer) effectively unreadable for a dark-mode user with low vision. There's also no `accessibilityRole="header"` distinguishing the deal name from the price from the legal fine print for a screen-reader user working through an information-dense Condiciones block.

**Riley (Deliberate Stress-Tester):** Opens a campaign offer that had three advertised percentages on its list card and finds the detail screen silently drops the multi-percentage disclosure — a factual regression, not a cosmetic one. Opens an old deep link after `activeTo` has passed and the screen still says "Vigente hasta el [past date]," then heads to the store expecting a live deal that no longer exists.

## Minor Observations

- `heroTitle` fontSize is `26` — off the type scale (36/28/22/20…), a one-off between `headline`(28) and `title`(20-22).
- `validityBanner`'s `marginHorizontal: -20` hardcodes the negative of `space.xl` instead of referencing it — both assessments independently flagged this exact line.
- The list-item `bullet` dot uses `colors.cyan` purely as decoration; DESIGN.md reserves cyan for interactive/value-marking use, not a static list marker.
- `heroTitle`/`heroStoreName` have no `numberOfLines` guard, unlike every sibling card — a long headline or retailer+province string can wrap uncontrolled.
- Price formatting is reimplemented inline (`Math.round(offer.price).toLocaleString("es-AR")`, 3 times) instead of reusing the already-shared `formatCurrency()` from `utils/format.ts` — low impact today, same "reimplement instead of reuse" pattern flagged elsewhere in this app; fixing the P1 `offerPromo()` integration would naturally absorb this too.
- For campaign offers, `heroSubtitle` never renders (gated on `offer.kind === "catalog"`), leaving the hero sparser than the catalog case with no compensating content.

## Questions to Consider

1. `describePromo()` carries pages of hard-won reasoning about wording a discount honestly — why is the one screen whose entire job is showing a single offer in full the one place that never calls it?
2. DESIGN.md's own North Star says "every number gets its own tile instead of being buried in a sentence" — why is offer detail the one screen in the app where two prices share a sentence with a middle dot?
3. `RecurringProductsScreen` already computes offer urgency/expiry — should `OfferDetailScreen`, arguably the highest-stakes "should I actually go to this store" screen, be the one place that never checks whether the deal it's showing is still alive?
