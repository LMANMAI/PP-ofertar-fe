---
target: registerstep1, segunda corrida
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\RegisterStep1.tsx"
target_fingerprint: "sha256:2a65ee442f8a628a6550616c60de8d14152882978cc00915567020f86f7f12de"
target_path: "D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\RegisterStep1.tsx"
timestamp: 2026-09-24T07-27-13Z
slug: src-screens-registerstep1-tsx
---
Method: dual-agent (A: design review, B: detector + browser evidence)

# Critique 2: RegisterStep1 after fixes

Detector: exit 0, 0 findings (web/CSS-oriented; weak evidence for React Native).

## Design Health Score: 28/40 - Good (70%). Previous run 20/40.
1:3 2:3 3:2 4:3 5:3 6:3 7:2 8:4 9:3 10:2

## Cognitive load
Low: 1 of 8 failures (CTA hierarchy). Previously 4.

## Design Specificity Verdict
Competent but generic; on-token, nothing says OfertAR/savings/Argentina, and it drops the welcome screen's promise.

## Priority Issues
- [P2] Terms row weakest element and acceptance lost on back; duplicates welcome-screen implicit consent. Commands: distill, clarify.
- [P2] CTA below the fold at 360x600/320x568 (137/169px scroll); dark-mode button relies on 1px cyan border. Commands: layout, colorize.
- [P2] Generic copy; referral row gives no reason to open. Command: clarify.
- [P2] Web a11y mapping: progressbar has no value, referral row no aria-expanded, terms error not tied to checkbox, Volver 28x28 on web. Command: harden.
- [P3] Step 2 progress role and special-char rule missing, Apellido optional unmarked, DESIGN.md error-border rule vs code, done key does not submit. Command: polish.

## Persona red flags
Jordan: no reason for referral code; terms leave the app. Casey: CTA below fold at 600px, terms tick lost on back. Sam: expanded/progress values missing in DOM. Marcela: no data-use reassurance next to smallest type.

## Minor
Focus is only a border color change (1.48:1 light); html lang=en on web; a light-mode cyan border on Continuar seen once under emulation (unverified).

## Questions
Why is consent a chore instead of showing what the account holds? Are two steps worth it for four fields? Why hide the referral code, the growth loop?
