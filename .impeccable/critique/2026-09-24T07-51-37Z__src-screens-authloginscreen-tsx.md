---
target: login
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\AuthLoginScreen.tsx"
target_fingerprint: "sha256:890a403adf779d60f0f85f37fbf5c9daf2c1e55c1839d7895c5da1e88dd2ff93"
target_path: "D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\AuthLoginScreen.tsx"
timestamp: 2026-09-24T07-51-37Z
slug: src-screens-authloginscreen-tsx
---
Method: dual-agent (A: design review, B: detector + browser evidence)

# Critique: AuthLoginScreen (login)

Detector: exit 0, 0 findings (web/CSS-oriented; weak evidence for React Native).

## Design Health Score: 24/40 - Acceptable (60%)
1:3 2:3 3:3 4:2 5:2 6:3 7:2 8:3 9:1 10:2

## Cognitive load
Moderate: 2 of 8 failures (flat hierarchy; email retyped for recovery).

## Design Specificity Verdict
Generic and lightly branded: correct tokens, but empty navy header strip (back arrow only), medium-weight title, generic subtitle; no bridge from the welcome screen's ticket card and coral CTA.

## Priority Issues
- [P1] Failed login shows raw err.message ("Error del servidor (401)", English network strings), no recovery action. Command: harden.
- [P1] Forgot-password is simulated: PasswordRecoveryScreen only calls setScreen("checkEmail"), no reset endpoint in backend or authApi, copy promises an email. Command: clarify.
- [P2] Not consistent with redesigned register steps: CTA scrolls (y 412/812), medium title, card background, no email pattern check. Command: layout.
- [P2] Focus/targets: eye toggle and Volver 32x32 on web, eye has no focus ring, Volver ring 1.00:1 in light, inputs no outline, error border hides focus, no aria-describedby, errors shift button 52px. Command: harden.
- [P3] No brand in header, no biometric option on login, no returning-user tone. Commands: onboard, delight.

## Persona red flags
Jordan: "Error del servidor (401)" and no recovery link. Casey: CTA not in thumb zone, English network error, register link below fold with two errors at 320x568. Sam: no focus on eye, Volver ring invisible in light. Marcela: technical error, then a reset email that never arrives.

## Minor
Idle input borders 1.32-1.34:1; inputs lack name/id; html lang=en; focusRing/isFocused duplicated across screens.

## Questions
Why does "Ya tengo cuenta" show an empty form for a returning user? Full screen or sheet over the welcome? What should a failed login say for an honest brand?
