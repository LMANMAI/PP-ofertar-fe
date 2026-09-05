---
target: the dark theme
total_score: 4
max_score: 12
na_heuristics: 1,2,3,5,6,7,10
p0_count: 2
p1_count: 2
target_identity: "file:D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\theme\\designSystem.ts"
target_fingerprint: "sha256:7697f2f151782b2ab6399816cf0a6380f99be8f6da7f7f10a136b87a47f36fd2"
target_path: "D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\theme\\designSystem.ts"
timestamp: 2026-09-03T05-13-28Z
slug: src-theme-designsystem-ts
---
# Dark Theme Critique — OfertAR

**Method: dual-agent (A: design review · B: detector + deterministic evidence)**

## Design Health Score

Scoped to what a color-theme critique can actually evaluate — heuristics about workflow, terminology, and interaction patterns don't move with a palette swap, so most are marked n/a here rather than forced to a number.

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | n/a | Unaffected by color theme |
| 2 | Match System / Real World | n/a | Unaffected by color theme |
| 3 | User Control and Freedom | n/a | Unaffected by color theme |
| 4 | Consistency and Standards | 1 | Same token (colors.navy) renders correctly-as-background in some places and invisible-as-foreground-text in others, sometimes on the same screen |
| 5 | Error Prevention | n/a | Unaffected by color theme |
| 6 | Recognition Rather Than Recall | n/a | Unaffected by color theme |
| 7 | Flexibility and Efficiency | n/a | Unaffected by color theme |
| 8 | Aesthetic and Minimalist Design | 1 | Invisible nav/CTA text, unstyled maps, and ~58 hardcoded pastel banners break an otherwise coherent dark surface |
| 9 | Error Recovery | 2 | Error messages stay technically readable but the banner styling looks broken, undermining trust at the exact moment a user needs reassurance |
| **Total** | | **4/12** | **Poor (33%)** |

## Design Specificity Verdict

The token layer (`src/theme/designSystem.ts`) is genuinely authored — `darkColors` uses distinct hues for background/card, not brightness-adjusted grays, and text-on-surface pairs measure 5.9-15.8:1 contrast. cyan/orange kept identical across themes read even better in dark mode. But the theme-wiring pass converted `colors` to `useThemeColors()` mechanically without auditing which semantic role each style should pull from. `colors.navy` was the light-only design's de-facto primary text color (near-black, worked on white) and was never re-pointed to `colors.defaultText` for ~100+ call sites, because the reference was already spelled `colors.navy` before rewiring.

Deterministic scan: `detect.mjs` returned [] (clean) but this is inconclusive — the same files contain dozens of confirmed literal hex values it should plausibly flag; reads as a web/CSS-oriented detector with no real RN StyleSheet coverage, not evidence of cleanliness. Manual grep: 0 static `colors` imports remain, 50/55 files use `useThemeColors()`; the one real gap is `src/components/ui/Toast.tsx`, entirely unwired. 73 pastel-hex matches across 33 files (~58 genuine after filtering brand-identity false positives like supermarket chain colors). 0/2 MapView instances have `customMapStyle`. 0/46 StatusBar usages are theme-conditional.

## Overall Impression

The palette itself would pass a critique on its own. What ships today doesn't, because token quality never carried through to the screens: the active tab label, headline prices, and primary CTAs go functionally invisible, both map screens punch a bright rectangle into an otherwise dark UI, and error/status banners look broken rather than designed. The single biggest opportunity is also the cheapest fix: a targeted sweep of `color: colors.navy` call sites to the correct existing token.

## What's Working

1. The `darkColors` token set — deliberately distinct hues, every text-on-surface pair independently AA-verified.
2. cyan/orange as fixed brand accents — read better in dark mode than light by design.
3. `InputField.tsx`/`BottomNav.tsx`'s inactive tab state — the correct reference pattern: every role delegated to a token that actually changes between themes.

## Priority Issues

**[P0] colors.navy used as foreground text/icon color renders near-invisible on dark surfaces, ~100+ sites**
Why it matters: navy (#0A1F44) on background (#0B1220) measures ~1.15:1, on card ~1.07:1 — catastrophically below the 4.5:1 AA floor. Hits BottomNav's active tab label/icon, Home/OffersScreen headline prices, ComparePricesScreen's precioDestacado, TicketProcessedScreen's save button, AuthLoginScreen's signup CTA.
Fix: sweep every `color: colors.navy` foreground use to `colors.defaultText`/`mutedText2`/`cyan` by role; keep navy only as a background paired with white foreground.
Suggested command: /impeccable polish

**[P0] Both map screens (StoreDetailScreen, FavoriteStoresScreen) render default light-styled tiles, no customMapStyle anywhere**
Why it matters: FavoriteStoresScreen's map is the 280px hero element — a bright white rectangle in an otherwise near-black UI, on a core flow.
Fix: apply a night-mode customMapStyle JSON conditionally via useColorScheme() on both MapView instances; verify iOS support separately from Android.
Suggested command: /impeccable adapt

**[P1] Five screens hardcode style="dark" status bar over a background that goes dark in dark mode**
Why it matters: verified directly — GoogleChooseAccountScreen, GoogleVerifyingScreen, LoaderScreen sit on colors.card; LocationPermissionScreen, PasswordSuccessScreen sit on colors.background. Both go dark in dark mode, so dark status-bar icons disappear.
Fix: make StatusBar style theme-conditional on these 5 screens.
Suggested command: /impeccable polish

**[P1] ~58 hardcoded pastel hex literals for status banners/badges across 23 files, never adapted for dark**
Why it matters: repeated pattern (#FEF2F2/#991B1B error banners, #E0F5EF success badges, #E8F6FC info wells, #FFF7ED pending status) across OffersScreen, TicketHistoryScreen, FavoriteStoresScreen, TicketProcessedScreen, HomeScreen, ProfileScreen, PointsScreen. Reads as a rendering mistake on dark cards, worst at exactly the moment (errors) a user needs to trust the message.
Fix: promote to real token pairs (successSoft/dangerSoft/warningSoft/infoSoft with genuine dark variants) and sweep call sites.
Suggested command: /impeccable polish

**[P2] shadowColor: colors.navy produces no visible shadow in dark mode**
Why it matters: navy's luminance is close to background/card, so card-lift and floating-button depth cues disappear in dark mode (HomeScreen/OffersScreen cards, BottomNav scan button, PointsScreen balance card). Possibly iOS-specific; Android elevation needs a real-device check.
Fix: switch shadow color to near-black at higher opacity in dark mode, or use a lighter surface tone for elevation instead.
Suggested command: /impeccable polish

## Persona Red Flags

**Sam (Accessibility-Dependent User)**: the navy-on-dark bug is a hard contrast failure (~1.1:1 vs 4.5:1 required) — fails for anyone in dark mode, not just an edge case. The active tab and every headline price are effectively blank.

**Casey (Distracted Mobile User)**: checking savings on the walk home at night — exactly dark mode's use case — Casey can't read priceNow/precioDestacado (invisible navy-on-dark) and will assume the app is broken.

## Minor Observations

- mutedText2/subtleText are near-duplicate tokens in both palettes — worth consolidating.
- ProfileScreen's Switch components hardcode trackColor false: "#D9DEE5", doesn't adapt.
- Empty-state icons at 56px use colors.border (~1.3:1 contrast by design) — read as near-invisible ghosts in dark mode.
- TicketProcessedScreen.tsx:320 hardcodes color: "#C7CDD4" for a disabled icon instead of a themed token.

## Questions to Consider

- What other light-mode assumptions are hiding behind tokens that happen to share a name with their intended dark-mode role?
- Should dark-mode map styling be core scope rather than a follow-up, given it's the most jarring discontinuity a user will hit?
