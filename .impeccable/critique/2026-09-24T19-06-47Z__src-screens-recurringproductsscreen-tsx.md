---
target: productos recurrentes
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\RecurringProductsScreen.tsx"
target_fingerprint: "sha256:cfe6379bb29ccc66054204f5cce68bc83823e59037ae45c8719c9cf6fbcc0b27"
target_path: "D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\RecurringProductsScreen.tsx"
timestamp: 2026-09-24T19-06-47Z
slug: src-screens-recurringproductsscreen-tsx
---
Method: dual-agent (A: ab2b064588b0cc360 · B: ae324f1912cba8d8f)

# Critique: Productos recurrentes (RecurringProductsScreen.tsx)

Score: 20/40 (Aceptable). n/a: none.

| # | Heuristica | Score | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | Spinner sin skeleton; sin frescura de ofertas |
| 2 | Lenguaje del usuario | 2 | Descripciones crudas de OCR como producto; "Comprado 2 veces en 1 compra" |
| 3 | Control y libertad | 2 | Sin buscar/filtrar/ordenar ni descartar match malo |
| 4 | Consistencia | 3 | Badge -25% vs tile HASTA 30%; "Mejor en" no se usa en otras pantallas |
| 5 | Prevencion de errores | 1 | Precio de otro producto como titular |
| 6 | Reconocer vs recordar | 3 | Solo un chevron de 18px indica que se toca |
| 7 | Flexibilidad | 1 | Orden fijo, ~3700px de scroll sin atajos |
| 8 | Minimalismo | 2 | 42% del texto < 12px; bloque de descuento repetido 9 veces |
| 9 | Recuperacion de errores | 1 | ErrorBanner sin onRetry (linea 125) |
| 10 | Ayuda | 2 | Avisos honestos escondidos en el detalle |

## Veredicto de especificidad
Parcialmente propio. Propio: tile + chip calido, "Llevando 1 sola unidad", comparacion con ultimo ticket. Intercambiable: cascaron colapsado, mismo icono en las 20 cards. Fuga de confianza: bolsa de residuos -> precio de rollo de cocina; laurel molido -> aji molido; garrapinada -> turron. Detector: 0 hallazgos (no ve problemas de StyleSheet RN). Overlay omitido (sesion solo en memoria).

## Problemas prioritarios
- [P1] Precio de otro producto como titular -> "Similar en X", "Precio de:" a 13px, sin badge % en matches flojos; campo de confianza en backend. /impeccable clarify
- [P1] Blanco sobre verde 2,28:1 (bestChip linea 542; tambien altDiscount claro, badge -40% claro 4,41:1, icono cyan claro 1,67:1) -> navy sobre verde o successSoft, 12px. /impeccable colorize
- [P1] La lista no dice que conviene primero -> total ahorrable, selector de orden, agrupar sin oferta, subir "por debajo de lo que pagaste". /impeccable layout, /impeccable shape
- [P1] Sin reintento ni refresco -> load() + onRetry, RefreshControl, skeleton, conservar lista. /impeccable harden
- [P2] Densidad/tipografia (9px x10, 11px x55, 12px x41; sin tokens typography/radii) -> piso 12px, tile solo con mecanica no trivial, reconciliar badge y tile. /impeccable typeset, /impeccable distill

## Personas
Jordan: nada indica header tocable; "cualquiera" falso (6 inertes); match raro parece bug; titulos OCR parecen bugs.
Sam: contraste 2,28:1; kickers 9px; sin aria-expanded en DOM web; nombre accesible sin oferta/precio/cadena; html lang=en; adjustsFontSizeToFit hasta ~12px.
Casey: 20 cards en ~3700px sin salto; una sola card abierta; sin scroll-into-view; cadena y precio en extremos.

## Menores
"Mejor en" vs "de tu compra"; key barcode||description; bloque alternativas siempre visible; cards sin oferta sin senal de inerte; LoadingState generico.

## Preguntas
Precio de otro producto como numero mas grande? Recurrentes o feed de ofertas? Donde esta el total? Frecuencia vs ahorro real?
