---
target: registerstep2
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\RegisterStep2.tsx"
target_fingerprint: "sha256:531a0344e8d4afce2e33735b6a54ee7d55e6abeff77fdbbbc90d048d4af26627"
target_path: "D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\RegisterStep2.tsx"
timestamp: 2026-09-24T07-40-21Z
slug: src-screens-registerstep2-tsx
---
Method: dual-agent (A: design review, B: detector + browser evidence)

# Critique: RegisterStep2 (registration step 2, choose a password)

Detector: exit 0, 0 findings on the screen and on PasswordStrengthBar (web/CSS-oriented; weak evidence for React Native).

## Design Health Score: 25/40 - Acceptable (62%)
1:3 2:3 3:3 4:2 5:3 6:3 7:1 8:3 9:2 10:2

## Cognitive load
Moderate: 2 of 8 failures (duplicated rules in subtitle and checklist; double channel for one fact plus invisible mismatch).

## Design Specificity Verdict
Generic but competent: brand shell only, nothing ties the password to the savings promise; title lighter than step 1.

## Priority Issues
- [P1] Mismatch invisible: matches computed but not passed to PasswordStrengthBar, repeat field has no error, "Muy fuerte" can never show. Command: harden.
- [P1] CTA: enabled navy on dark page 1.15:1 (step 1 already fixed with cyan), disabled text 2.29:1 in light, plain div with no role/disabled state, no reason shown. Commands: colorize, clarify.
- [P1] Keyboard/autofill: autocomplete on, no new-password, sentences capitalize, autocorrect on, no enterkeyhint/chaining, CTA inside scroll (24px visible at 320x568). Commands: harden, layout.
- [P2] Backend errors shown raw (network text, email already used offers no action). Command: harden.
- [P2] Strength label/icon colors low contrast in light (amber 2.05, cyan 1.59, green 2.18), label pops in and shifts layout ~24px, no live region. Commands: colorize, distill.

## Persona red flags
Jordan: "Fuerte" but button dead, no reason. Casey: keyboard covers CTA, raw network error. Sam: CTA no role/disabled, meter not announced, no heading. Marta: no reassurance on password storage, no new-password for manager.

## Minor
Hardcoded #F59E0B; "Aaaaaaa1!" rated Fuerte; title medium weight and no header role; step label in system font; Volver 28px and eye 32px on web.

## Questions
Why disable the CTA instead of per-field errors? Do four rules add security or friction? Could the password step tie to the savings promise?
