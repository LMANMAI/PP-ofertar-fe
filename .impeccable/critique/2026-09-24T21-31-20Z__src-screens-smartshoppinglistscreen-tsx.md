---
target: consumos inteligentes
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\SmartShoppingListScreen.tsx"
target_fingerprint: "sha256:9577ed4f69e2268dea193266b51468a316880204e626575d2761de07f0c5cac6"
target_path: "D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\SmartShoppingListScreen.tsx"
timestamp: 2026-09-24T21-31-20Z
slug: src-screens-smartshoppinglistscreen-tsx
---
Method: dual-agent (A: aae84c5f9eb2fc2e5 · B: acd2a8bd823477885)

# Critique: Tus consumos inteligentes (SmartShoppingListScreen.tsx)

Score: 19/40 (Pobre). n/a: none.

| # | Heuristica | Score | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 2 | Ticket de referencia sin nombre ni fecha; tildes no guardadas |
| 2 | Lenguaje del usuario | 2 | Cinco nombres para los mismos datos; "te falta comprar" no respaldado |
| 3 | Control y libertad | 2 | Filas del ticket no se destildan; sin "ya no lo compro" |
| 4 | Consistencia | 1 | Match flojo distinto a Productos recurrentes; ErrorBanner sin retry |
| 5 | Prevencion de errores | 2 | Match flojo con chip verde y % entra en el ahorro |
| 6 | Reconocer vs recordar | 3 | Chip lejos de su aclaracion |
| 7 | Flexibilidad | 1 | Sin orden por relevancia, refresco ni tap a la oferta |
| 8 | Minimalismo | 3 | Heroe explicador; 4 senales de "hecho" |
| 9 | Recuperacion de errores | 1 | Error sin reintento, mensaje crudo; vacio sin CTA |
| 10 | Ayuda | 2 | No explica "habitual" ni contra que ticket compara |

## Veredicto de especificidad
Lista de tareas generica sobre datos de tickets. Nombre: "consumos" suele ser gastos de tarjeta; "inteligentes" sin logica detras. Cinco vocabularios. Detector: 0 hallazgos. B: filas sin rol/nombre/estado, 11 fontSize literales, radios 14/11/9 fuera de escala, blanco sobre verde 2,28:1, hero claro 4,38:1. Overlay omitido.

## Problemas prioritarios
- [P1] Identidad, nombre y solapamiento con Productos recurrentes -> una sola fuente; "no estaba en tu ultimo ticket" como seccion de Recurrentes y en ForgottenProductsSheet. /impeccable shape, /impeccable clarify
- [P1] "Te falta comprar" no es honesto (referencia implicita, sin cadencia, lastPaidAt ignorado, 2 tickets no alcanzan) -> nombrar el ticket, exigir 3, usar forgottenIn. /impeccable clarify, /impeccable harden
- [P1] Ofertas y ahorro incoherentes (match flojo con %, suma entre cadenas) -> isLooseMatch, excluir flojos, "Con oferta: X de Y", chip successSoft, sortByOfferRelevance. /impeccable harden, /impeccable colorize
- [P2] Modelo de tildado roto (no persiste, filas del ticket no destildan, clave repetible, sin rol checkbox) -> borrar el tildado manual. /impeccable distill
- [P2] Estados: todo hecho sin ofertas, error sin retry, vacio sin CTA -> onboard/harden
- [P3] Tokens y accesibilidad; "1 productos" -> typeset, polish

## Personas
Sam: filas sin rol/estado; secciones no son encabezados; chip sin contexto.
Casey: tildes se pierden; fila salta y el chip desaparece; chip 10px 2,3:1.
Riley: 6 filas hechas no responden; ahorro baja al tildar; mismo barcode tilda juntos; "1 productos".

## Menores
Home promete "que te falta ahora" y el estado todo-hecho dice nada; "compras" vs "tickets"; DESIGN.md dice successSoftText #15803D pero el codigo #166534.

## Preguntas
Para que sirve tildar? Es una pantalla o un momento posterior al escaneo? Que mostraria si tomara en serio el ticket? Es "todo listo" un exito?
