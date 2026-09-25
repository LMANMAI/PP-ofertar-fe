---
target: personaldatascreen
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\PersonalDataScreen.tsx"
target_fingerprint: "sha256:f05185bb97e3eb0c8da8c4b76171c378b2a9c2083fb6619cb72876f1f91a617f"
target_path: "D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\PersonalDataScreen.tsx"
timestamp: 2026-09-24T17-49-54Z
slug: src-screens-personaldatascreen-tsx
---
Method: dual-agent (A: design review, B: detector + browser evidence)

# Critique: PersonalDataScreen

Detector: 1 advisory (design-system-color, PersonalDataScreen.tsx:326 rgba(0,0,0,0.5)); web/CSS-oriented so otherwise weak evidence. Browser evidence: dark theme, 375x812, strictly read-only (no focus/typing); personal values not reproduced.

## Design Health Score: 21/40 - Acceptable (52%)
1:2 2:3 3:2 4:2 5:1 6:3 7:2 8:3 9:2 10:1

## Cognitive load
Moderate: 2 of 8 failures (one thing at a time; progressive disclosure).

## Design Specificity Verdict
Generic stock "edit profile" form on tokens; no reason for each datum, nothing about the photo, no honest note that the email is locked; photo sheet off-system.

## Priority Issues
- [P1] handleSave calls updateProfile then onBack without onSessionUpdate (only the photo path updates the session): Perfil and the Home greeting keep the old name after "Datos actualizados correctamente" (verified in code). Command: harden.
- [P1] Email field looks editable (same style, onChangeText noop, sentence-cap/autocorrect), never sent to the backend. Command: clarify.
- [P1] No dirty state, no leave-without-saving guard, blank name saveable, save button in scroll at 48px. Command: layout.
- [P2] No validation; raw backend errors in one banner. Command: harden.
- [P2] Form attributes: autocomplete=on without tokens, autocapitalize=sentences on email/phone, Agregar foto and Guardar cambios are role-less divs, photo control 117x27, Volver 32x32, lang=en. Command: polish.
- [P3] Photo sheet: equal-weight actions, delete without confirm, hardcoded handle color and scrim, no privacy note or Settings route. Command: shape.

## Persona red flags
Jordan: types in email and nothing happens; no reason for phone. Casey: back loses edits; save below fold with keyboard. Sam: photo/save not announced as buttons. Marta: phone purpose, 5MB photo on mobile data.

## Minor
Save button navy vs dark page 1.15:1; lowercase initials; photo banners shift layout and never clear; bottom nav visible on a form; backend also saves address/alternativeBrands not shown here.

## Questions
Why is a locked email the third field above the editable phone? Which datum does OfertAR need? What if a save changed something visible immediately?
