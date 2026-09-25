---
target: primera pantalla al descargar la app (AuthWelcomeScreen)
total_score: 22
max_score: 32
na_heuristics: 7,9
p0_count: 0
p1_count: 2
target_identity: "file:D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\AuthWelcomeScreen.tsx"
target_fingerprint: "sha256:fa0d873a2bb4867f4b1f5a8ab0e7d9e24b35589886034ea46f1004ed52d621e5"
target_path: "D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\AuthWelcomeScreen.tsx"
timestamp: 2026-09-24T04-51-50Z
slug: src-screens-authwelcomescreen-tsx
---
Method: dual-agent (A: design review, B: detector + browser evidence)

# Critique: AuthWelcomeScreen (first screen after install)

Detector: exit 0, 0 findings (web/CSS-oriented; weak evidence for React Native StyleSheet).

## Design Health Score: 22/32 (n/a: 7, 9) - Acceptable

1 Visibility of status 3 | 2 Real-world match 3 | 3 User control 3 | 4 Consistency 3 | 5 Error prevention 3 | 6 Recognition 3 | 7 n/a | 8 Minimalism 3 | 9 n/a | 10 Help 1

## Design Specificity Verdict
Category-interchangeable: navy field, logo, headline with one cyan word, two CTAs. The product's real hook (scan a ticket, learn what to buy next) and the "Honest Receipt" idea never appear. Logo gradient blue does not match flat brand navy.

## Priority Issues
- [P1] Contrast: "Crear cuenta" white 13px on coral 3.09:1; legal line white 35% 10px 3.13:1; legal terms/privacy not tappable. Fix: navy/cyan CTA text, 12px tappable legal links. Commands: colorize, harden.
- [P1] Generic, unproven value proposition; account requested before any value shown. Fix: concrete copy + labeled example receipt in empty middle zone. Commands: shape, clarify.
- [P2] Coral CTA contradicts DESIGN.md (navy owns primary actions), radius 14 vs token 10, 13px vs 14-15px labels. Command: typeset.
- [P2] Buttons lack accessibilityRole/label; logo alt empty. Command: harden.
- [P3] Empty middle zone, no entrance motion. Commands: delight, animate.

## Persona red flags
Jordan: unclear what a ticket yields; no help. Casey: 10px legal and 13px labels wash out in sun. Sam: low contrast, no button role. Marta (inflation-hit shopper): no peso example, will not hand over credentials.

## Minor observations
Body text 6.24:1 and secondary button 5.25:1 pass (measured). Overline tracking 2.2 vs 1.2. Medium weight vs documented Bold. No short-phone fallback. Navy flash while fonts load. Page lang=en.

## Questions
Without the logo, is this recognizable as a ticket app? Why ask for an account before showing any number? Why does the first screen prove nothing?
