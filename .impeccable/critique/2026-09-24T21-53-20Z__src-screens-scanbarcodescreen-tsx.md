---
target: resultado del escaneo de codigo de barras
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\ScanBarcodeScreen.tsx"
target_fingerprint: "sha256:ae645b94706436240ba65982eca2fd4b5719349a5cd59e92bc83d8117669e67c"
target_path: "D:\\Proyectos\\ofertar\\PP-ofertar-fe\\src\\screens\\ScanBarcodeScreen.tsx"
timestamp: 2026-09-24T21-53-20Z
slug: src-screens-scanbarcodescreen-tsx
---
Method: dual-agent (A: a511e9be07bc24414 · B: a728d8ca7c84966ce)

# Critique: resultado del escaneo de codigo de barras (ScanBarcodeScreen.tsx, estados buscando/resultado/error)

Score: 19/40 (Pobre). n/a: none. Alcance: sin browser (camara bloqueada en web); fuente + API real + contraste calculado de tokens.

| # | Heuristica | Score | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 2 | Spinner sobre camara sin scrim ni codigo; sin timeout; fecha ISO |
| 2 | Lenguaje del usuario | 2 | Nombres SEPA en mayusculas, jerga EAN/SEPA |
| 3 | Control y libertad | 2 | "Reintentar" no reintenta; "Escanear otro" bajo la lista |
| 4 | Consistencia | 2 | Sin BottomNav; "Mas barato" vs "Mejor/Similar en" |
| 5 | Prevencion de errores | 2 | Primer codigo en el cuadro; sin filtro del ultimo |
| 6 | Reconocer vs recordar | 3 | Tarjeta de identidad confirma el escaneo |
| 7 | Flexibilidad | 1 | Sin linterna, codigo manual, precio del estante, historial |
| 8 | Minimalismo | 3 | Tarjeta de identidad sobra sin producto |
| 9 | Recuperacion de errores | 1 | Mensaje crudo; 400 con icono offline; sin siguiente paso |
| 10 | Ayuda | 1 | No explica minimo/promedio/maximo ni el alcance |

## Veredicto de especificidad
Tarjeta de precio generica; Resultado copia ComparePricesScreen. Ignora el historial de tickets. Detector: 1 advisory (#000 del visor). B: badge 10px, 8 radios literales, paddings 15/18/32, Pressables sin rol/etiqueta. Contraste: borde cian fila mas barata claro 1,6:1; boton navy oscuro 1,15:1; aviso claro 4,48:1; icono error 2,96:1.

## Problemas prioritarios
- [P1] No responde "el precio que veo es justo?" -> campo "A cuanto esta aca?", veredicto, "Pagaste $X en tu ultimo ticket", cadenas favoritas. /impeccable shape, /impeccable layout
- [P1] "Mas barato" y numeros sobre-afirman (badge con 1 comercio, minimo por sucursal, estaciones de servicio, promedio ponderado, sin mapa) -> alcance, rango por fila, "Mas bajo" con 2+ comercios. /impeccable clarify
- [P1] Callejon sin salida, "Reintentar" que no reintenta, bucle de relectura, error crudo, sin timeout; 26/33 EAN de la muestra sin datos -> guardar EAN, debounce, timeout, siguiente paso. /impeccable harden
- [P2] Frescura (fechaDataset) y "Escanear otro" enterrados; sin margen inferior seguro -> fecha arriba, pie fijo. /impeccable layout, /impeccable adapt
- [P3] Tokens y accesibilidad -> polish, typeset

## Personas
Casey: numero de otra cadena, sin precio del estante, "Escanear otro" bajo 10 filas y relee el codigo, sin linterna.
Sam: 10-11px, 4 botones sin rol, sin region en vivo, secciones no son encabezados.
Jordan: promedio/maximo leidos como rango de su super; nombres en mayusculas; EAN con ceros.

## Menores
encontrado y cantidadOfertas sin uso; Resultado duplicado con ComparePricesScreen; titulo "Escanear producto" en el resultado; atras de Android sale del escaner vs header a Inicio.

## Preguntas
Por que ignora el historial de tickets? Un minimo nacional sirve en Rosario? Y si el estado no encontrado fuera un momento disenado? Mejor "no hay informacion suficiente" que "$3.795"?
