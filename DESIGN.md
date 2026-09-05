---
name: OfertAR
description: A native Expo/React Native app for tracking Argentine grocery spending and finding real savings — designed so nothing on screen claims more than the data behind it backs up.
colors:
  ledger-navy: "#0A1F44"
  highlighter-cyan: "#7DD4F5"
  alert-coral: "#E76F51"
  paper-background: "#F8FAFC"
  card-surface: "#FFFFFF"
  ink-text: "#0F172A"
  muted-text: "#5C6B84"
  subtle-label: "#6A7482"
  hairline-border: "#D8E1EE"
  divider-line: "#E5E7EB"
  on-color-text: "#FFFFFF"
  savings-green: "#22C55E"
  alert-red: "#EF4444"
  success-soft-bg: "#E0F5EF"
  success-soft-text: "#15803D"
  danger-soft-bg: "#FEF2F2"
  danger-soft-text: "#991B1B"
  warning-soft-bg: "#FFF7ED"
  warning-soft-text: "#B45A14"
  info-soft-bg: "#E8F6FC"
  info-soft-text: "#0A1F44"
  warm-chip-bg: "#FDECE6"
  warm-chip-text: "#B44A2E"
  navy-muted-text: "#99B2CC"
typography:
  display:
    fontFamily: "PlusJakartaSans_700Bold"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: "44px"
  headline:
    fontFamily: "PlusJakartaSans_700Bold"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "36px"
  title:
    fontFamily: "PlusJakartaSans_700Bold"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "26px"
  body:
    fontFamily: "PlusJakartaSans_400Regular"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "22px"
  label:
    fontFamily: "PlusJakartaSans_500Medium"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "19px"
  overline:
    fontFamily: "PlusJakartaSans_500Medium"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "14px"
    letterSpacing: "1.2px"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  full: "999px"
  button: "10px"
spacing:
  xs: "4px"
  xsPlus: "6px"
  sm: "8px"
  smPlus: "10px"
  md: "12px"
  mdPlus: "14px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ledger-navy}"
    textColor: "{colors.on-color-text}"
    rounded: "{rounded.button}"
    height: "52px"
  button-danger:
    backgroundColor: "{colors.alert-red}"
    textColor: "{colors.on-color-text}"
    rounded: "{rounded.button}"
    height: "48px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.muted-text}"
    height: "44px"
  card:
    backgroundColor: "{colors.card-surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.card-surface}"
    rounded: "{rounded.button}"
    height: "52px"
    padding: "0 14px"
  chip-success:
    backgroundColor: "{colors.success-soft-bg}"
    textColor: "{colors.success-soft-text}"
    rounded: "{rounded.sm}"
---

# Design System: OfertAR

## Overview

**Creative North Star: "The Honest Receipt"**

OfertAR reads like a well-kept receipt: itemized, precise, and never dressed up to look like more than it is. Every number gets its own tile instead of being buried in a sentence; every claim about a discount, a subscription benefit, or a redemption is qualified the instant it isn't real yet ("vista previa," "todavía no se puede canjear de verdad"). This isn't a copywriting quirk — it's a load-bearing principle from the product's own PRODUCT.md ("no fabricar lo que no existe," never fabricate what doesn't exist), and it shows up visually too: real supermarket brand colors instead of a generic palette (Carrefour navy, Dia red, Coto red), a rewards flow that renames "redeem" to "guardamos tu interés" because nothing is actually redeemed yet, a payment-methods screen that tells the user outright there's no subscription to manage.

Visually, that honesty translates into restraint. Ledger Navy is the app's authority color — headers, primary buttons, the summary card on every ticket — and it stays fixed whether the phone is in light or dark mode, because it's the anchor the rest of the palette is judged against, not a surface that shifts with context. Highlighter Cyan is reserved for the thing worth marking: a discount, a focused input, an active filter, the scan action. Alert Coral appears sparingly, for warmth and conditional emphasis. Everything else — near-white backgrounds, muted grays, soft pastel status pills — exists to keep those three colors legible, not to compete with them.

The app is built with Expo/React Native and TypeScript, using a manual screen-state machine in `App.tsx` rather than a navigation library — a deliberate architectural choice for an app this size, not a gap to fill. Every screen reads its colors through a `useThemeColors()` hook, so light and dark mode are both first-class from the start, not a light design with a dark mode bolted on afterward.

**Key Characteristics:**
- Itemized and precise — numbers earn their own visual space, never buried in prose
- Every unbuilt feature is labeled as a preview, consistently, everywhere it appears
- One fixed authority color (navy) anchors both themes; everything else adapts
- Flat by default; elevation is reserved for things meant to feel physically lifted
- Real-world grounding over generic patterns (actual chain colors, actual receipt conventions)

## Colors

The palette reads as controlled and confident rather than colorful — three brand colors carry almost all of the app's personality, and a much larger set of neutral and semantic tokens exists purely to keep those three legible in any context, including dark mode.

### Primary
- **Ledger Navy** (`#0A1F44`): The app's authority color. Headers, primary buttons, hero/summary cards, the confirm-sheet backdrop tint. Identical in light and dark mode — every other color adapts to the theme; this one is the fixed point everything else is judged against.

### Secondary
- **Highlighter Cyan** (`#7DD4F5`): The interactive accent — focus rings, active filter pills, discount badges, the scan tab, "ver más" links. If something on screen is cyan, it's either interactive or marking where the value is, the way a highlighter pen marks a receipt line.

### Tertiary
- **Alert Coral** (`#E76F51`): Used sparingly for warmth and a subset of warning icons. Not a CTA color — navy owns primary actions; coral never competes with it for that role.

### Neutral
- **Paper Background** (`#F8FAFC` light / `#0B1220` dark): Screen background.
- **Card Surface** (`#FFFFFF` light / `#111A2C` dark): Card and surface fill.
- **Ink Text** (`#0F172A` light / `#E7ECF5` dark): Primary text color.
- **Muted Text** (`#5C6B84` light / `#8B97AE` dark): Secondary text — hints, metadata, timestamps.
- **Subtle Label** (`#6A7482` light / `#9BA6BC` dark): Section labels and the lowest-emphasis text in the hierarchy.
- **Hairline Border** (`#D8E1EE` light / `#25314A` dark): Card and input borders.
- **Divider Line** (`#E5E7EB` light / `#2A3650` dark): Row separators inside a card.
- **On-Color Text** (`#FFFFFF`, both themes): Text and icons set on a filled colored surface (navy buttons, danger buttons, badges) — the one text color that never changes with theme, because the surface it sits on doesn't either.
- **Navy Muted Text** (`#99B2CC`, both themes): Secondary/caption text set on a fixed navy surface (hero subtitles, validity banners, stat labels) — same reasoning as On-Color Text: navy doesn't shift with theme, so its muted-text companion doesn't either. Named after showing up as an identical hardcoded literal in 6 separate screens.

### Semantic pairs
Every status gets its own background/text pair, tuned independently per theme rather than a light pastel simply dimmed for dark mode.

- **Savings Green** (`#22C55E` bg-accent / soft pair `#E0F5EF` bg · `#15803D` text light, `#173226` bg · `#4ADE80` text dark): Savings realized, completed states.
- **Alert Red** (`#EF4444` bg-accent / soft pair `#FEF2F2` bg · `#991B1B` text light, `#3A1717` bg · `#F87171` text dark): Errors, destructive confirmations.
- **Warning soft** (`#FFF7ED` bg · `#B45A14` text light, `#3A2A14` bg · `#FBBF24` text dark): Permission denials, non-blocking cautions.
- **Info soft** (`#E8F6FC` bg · `#0A1F44` text light, `#12303A` bg · `#7DD4F5` text dark): Neutral explanatory banners.
- **Warm Chip** (`#FDECE6` bg · `#B44A2E` text light, `#3A2118` bg · `#F4A387` text dark): A conditional offer — "2nd unit at 50%" — that isn't a flat percentage off, so it earns its own warmth distinct from Danger and Warning without alarming the user.

### Named Rules
**The Fixed-Anchor Rule.** Ledger Navy never changes between light and dark mode. Every other color — including "brand" secondary and tertiary — is free to shift; navy is the one constant a returning user can always recognize the app by.

**The Redundant Signal Rule.** No status is ever communicated by color alone — every soft-pair chip or banner pairs its color with an icon, so the message survives for a colorblind user or bright sunlight.

## Typography

**Body & Display Font:** Plus Jakarta Sans (`PlusJakartaSans_400Regular` / `_500Medium` / `_700Bold`) — the only family used anywhere in the app.

**Character:** Geometric and clean, closer to a well-set financial statement than a playful consumer app — numbers and labels both read as precise rather than decorative.

### Hierarchy
- **Display** (700, 36px, 44px line-height): Rare — large hero numbers only.
- **Headline** (700, 28px, 36px line-height): Screen-level totals and hero titles ("¿Cerrar sesión?").
- **Title** (700, 20-22px, 26-28px line-height): Card-level emphasis, section heroes.
- **Body Large** (500, 17px, 26px line-height): Header titles, primary emphasized copy.
- **Body** (400, 15px, 22px line-height): Default paragraph and row text.
- **Label** (500, 14px, 19px line-height): Form field labels, row titles.
- **Caption / Micro** (400, 12-13px, 16-18px line-height): Meta text, hints, chip labels.
- **Overline** (500, 11px, 14px line-height, +1.2px tracking, uppercase): Section labels ("RADIO DE BÚSQUEDA") — the one place letter-spacing is used deliberately.
- **Tiny** (500, 10px, 13px line-height): Badge initials, the smallest chip text in the app.

### Named Rules
**The One Tracking Rule.** Letter-spacing is applied only to overline section labels. Every other text role sets at its natural tracking — spacing is a signal reserved for "this is a label, not content," and using it elsewhere would dilute that signal.

## Layout

Spacing runs on a 4/6/8/10/12/14/16/20/24px scale (`xs`4 / `xsPlus`6 / `sm`8 / `smPlus`10 / `md`12 / `mdPlus`14 / `lg`16 / `xl`20 / `xxl`24) — no arbitrary numbers for margin, padding, or gap. The half-steps (`xsPlus`, `smPlus`, `mdPlus`) exist because the tight end of the scale needed finer resolution than a pure 4-unit base gives: icon-to-label gaps and chip/card padding read as cramped at the next token down and loose at the next one up, so those in-between values were the app's de-facto convention (90+ call sites) long before they were named tokens.

Screen structure follows one shape almost everywhere: a fixed 56px navy header (back button or brand logo, title, optional trailing action), a scrollable content region with 16px page padding, and — on tab-root screens — a bottom nav bar that respects the device safe-area inset. Cards sit on 16px horizontal margins with 14px internal padding (`space.mdPlus`) — the app's standard compact-card padding, one step tighter than the 16px page margin. Two-column layouts (offer grids, ticket lists) activate only above the 768px tablet breakpoint; below it, everything is single-column and full-width.

## Elevation & Depth

Flat by default, with tonal separation (a 1px border or divider line) doing most of the work that shadow would otherwise do. Shadow is reserved for elements meant to feel physically lifted off the page: primary buttons, bottom sheets, the floating scan action, confirm-sheet modals. When used, it's soft and low-opacity — a suggestion of lift, not a drop-shadow effect.

### Shadow Vocabulary
- **Ambient lift** (`shadowOpacity: 0.06-0.25, shadowRadius: 8, shadowOffset: {0, 3}, elevation: 2`): The app's one shadow treatment, applied to floating buttons, cards that need to read as "above" the list around them, and modal sheets.

Shadow color itself is theme-aware: navy in light mode (reads as a soft tint against the pale background), pure black in dark mode (navy has almost no contrast against a dark background, so a navy shadow there would be invisible).

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest, separated by a border rather than a shadow. Shadow appears only on elements meant to feel raised off the page, never as decoration on an ordinary card.

## Shapes

Corner radius varies deliberately by what's being rounded, and the practice sits slightly looser than the formal token scale — worth stating honestly rather than smoothing over.

- **Buttons/CTAs** (10px): The single most common radius in the app, used on nearly every button even though it sits between the formal `sm` (8px) and `md` (12px) tokens rather than matching either exactly.
- **Cards** (12-16px): `rounded.md`/`rounded.lg`.
- **Chips/pills** (8-20px): Scales with chip height — a small tag chip rounds tighter than a large filter pill.
- **Avatars/badges/toggle knobs** (999px, `rounded.full`): Always a true circle.
- **Bottom sheets** (20px, top corners only): Sheet-specific; never applied to bottom corners.

Buttons are pill-adjacent but not fully rounded — a 10px radius on a ~48-52px-tall button reads as a softened rectangle, distinctly less playful than a full pill, matching the app's precise-not-playful character.

## Components

**Character:** precise and quietly confident. Rounded but not soft-edged everywhere, bold exactly where it matters (prices, primary actions, savings numbers), restrained everywhere else. Nothing decorative — every visual flourish is attached to a specific piece of information it's helping the user find faster.

### Buttons
- **Shape:** 10px radius (`rounded.button`), 48-52px height.
- **Primary:** Navy fill (`{colors.ledger-navy}`), white text, medium-weight 14-15px label. Used for the single most important action on a screen.
- **Destructive:** Same shape and weight as primary, `{colors.alert-red}` fill — reserved for irreversible actions confirmed through a confirm-sheet, never a lighter-weight everyday action.
- **Secondary/Cancel:** No fill, muted text color, same height footprint as the primary button in the same group so a button pair stays visually aligned.
- **Icon-only:** 32×32px hit target regardless of the icon's own visual size, always paired with `accessibilityLabel`.

### Chips
- **Style:** Soft-fill background + matching text color drawn from a semantic pair, 8-20px radius depending on size.
- **State:** No selected/unselected toggle variant — chips in this app are status indicators (discount, promo, done) rather than filter controls; filter selection uses pill buttons with a solid navy "active" fill instead.

### Cards / Containers
- **Corner style:** 12-16px radius.
- **Background:** `{colors.card-surface}`.
- **Shadow strategy:** None by default — see Elevation & Depth. A hero/summary card breaks this by using a solid navy fill instead of the card surface color, marking it as the one most-important block on the screen.
- **Border:** 1px `{colors.hairline-border}`.
- **Internal padding:** 16px (`spacing.lg`), 10-14px for denser list-row cards.

### Inputs
- **Style:** 52px height, 10px radius, 1px hairline border, label always visible above the field rather than a vanishing placeholder.
- **Focus:** Border and background both shift to cyan tints (`{colors.highlighter-cyan}` border, a soft cyan fill) — the app's one consistent focus treatment across every text field.
- **Error/Disabled:** Not a dedicated visual state on the input itself; validation errors surface as a separate inline message below the field instead of restyling the input border.

### Navigation
- **Style:** Fixed bottom bar, `{colors.card-surface}` background, active tab marked by icon fill plus label color shift rather than a pill background. A raised circular scan button sits at center, breaking the row's flat rhythm — the app's one deliberately oversized touch target, because it's the primary action reachable from anywhere in the app.

### Confirm Sheets (signature component)
A centered card over a navy-tinted backdrop (`rgba(10,31,68,0.7)`): an icon in a soft-danger or soft-info circle, a bold centered title, a muted centered subtitle, a filled action button, then a plain-text cancel link below it. This is the app's one consistent pattern for "you're about to lose or commit something" — used for logout, redemption, and ticket-discard confirmations alike, and never replaced by a bare native system alert.

## Do's and Don'ts

### Do:
- **Do** route every color through `useThemeColors()` so it adapts correctly between light and dark mode.
- **Do** hedge any copy describing an unbuilt feature ("vista previa," "todavía no") consistently across every screen that mentions it.
- **Do** use the shared `offerBadge()` helper for any store/retailer badge, so the same chain renders the same color everywhere.
- **Do** reach for the `space.xs`-`xxl` scale for every margin, padding, and gap.
- **Do** pair every status color with an icon, never color alone.
- **Do** use the confirm-sheet pattern for anything the user can't undo.

### Don't:
- **Don't** hardcode a hex value that has a token equivalent — it will look correct in light mode and break invisibly in dark mode.
- **Don't** let one screen describe a preview feature as real when every other screen treats it as a preview — that inconsistency is a trust violation, not a copy nitpick.
- **Don't** hand-roll a new initials-and-color function per screen for store identity.
- **Don't** add a shadow to a card just to make it feel more important — a border is this app's default answer to visual separation.
- **Don't** reach for a native `Alert.alert` for a branded, high-stakes confirmation — it's the one moment the app should look most like itself, not least.
