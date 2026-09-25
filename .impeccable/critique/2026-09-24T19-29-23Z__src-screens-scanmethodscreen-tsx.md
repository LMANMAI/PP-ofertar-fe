---
target: screen de escaneo
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\ScanMethodScreen.tsx"
target_fingerprint: "sha256:377501dd430685699afc39ec46f4bfbc3faa3413846f11c71e00960346e2d244"
target_path: "D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\ScanMethodScreen.tsx"
timestamp: 2026-09-24T19-29-23Z
slug: src-screens-scanmethodscreen-tsx
---
Method: dual-agent (A: a05e22b9b527147f0 · B: a9e8a28242362ad73)

# Critique: Escanear (ScanMethodScreen.tsx)

Score: 22/40 (Aceptable). n/a: none.

| # | Heuristica | Score | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | Estado activo de Escanear nunca se ve (sin barra inferior) |
| 2 | Lenguaje del usuario | 2 | "Escanear" nombra dos trabajos; "envialas en orden" sin explicar |
| 3 | Control y libertad | 3 | Atras de 32px; cancelar el picker de PDF vuelve sin avisar |
| 4 | Consistencia | 2 | Header propio, no ScreenHeader; titulo duplicado |
| 5 | Prevencion de errores | 2 | Nada ensena a sacar una buena foto |
| 6 | Reconocer vs recordar | 3 | Colores de tile sin sistema |
| 7 | Flexibilidad | 2 | Sin atajo a la camara ni metodo recordado |
| 8 | Minimalismo | 2 | ~7 bloques de texto para elegir entre 3; consejo decorativo |
| 9 | Recuperacion de errores | 2 | Sin estado sin camara ni ayuda ante permiso denegado |
| 10 | Ayuda | 1 | La unica "ayuda" es el consejo verde |

## Veredicto de especificidad
Lista generica de "elegi un metodo". Sin motivo de ticket, ejemplo ni promesa de ahorro. Detector: 0 hallazgos (no ve StyleSheet RN). B: badge 10px (unico < 12px); cards sin rol ni nombre; sin headings; atras 32x32; tile softNavy 1,11:1 contra su card; 8 fontSize literales; radios 6/14 y espaciados 28/18/3 fuera de tokens. Overlay omitido (sesion solo en memoria).

## Problemas prioritarios
- [P1] Chooser como primera pantalla equivocada -> el boton central abre CaptureTicketScreen; PDF y codigo de barras como secundarios; o agrupar "Registrar compra" / "Consultar precio" y recordar el ultimo metodo. /impeccable shape, /impeccable layout
- [P1] "Mas rapido" y consejo ecologico sin respaldo (PDF y fotos usan el mismo OCR, OcrClient.java:28; el ahorro de papel solo existe si se pide el ticket digital) -> sacar el badge, explicar el mecanismo o reemplazar por ayuda real. /impeccable clarify
- [P2] Nada ensena a sacar un buen ticket -> bloque "plano, con luz, completo" + ejemplo en primera vez. /impeccable onboard
- [P2] Header fuera de sistema (32px, sin rol header, titulo repetido; igual en PdfConfirm, ScanBarcode, ScanError) -> ScreenHeader. /impeccable polish
- [P2] Cards sin rol/etiqueta, tile softNavy invisible, sin estado sin camara -> harden. /impeccable harden

## Personas
Jordan: "Adjuntar PDF / Mas rapido" parece lo recomendado; "envialas en orden" sin explicar; nada muestra una buena foto.
Sam: cards sin rol ni nombre, sin headings, atras 32px, badge 10px, tile barcode casi invisible.
Casey: un toque extra ante el cajero, sin accion principal, ~153px vacios, sin ScrollView (se corta en 568px o con fuente grande).

## Menores
Alturas de card desiguales (97/97/115); chevron sobra; iconos sin aria-hidden; spacer de 32px en header; document.title igual en todas las pantallas.

## Preguntas
Por que la camara no esta abierta ya? Escanear producto es el mismo verbo? Que ensenaria esta pantalla si ensenara una sola cosa?
