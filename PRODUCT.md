# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Consumidores argentinos afectados por la inflación en las compras del supermercado. Sin segmento más específico confirmado (edad, rol en el hogar, nivel socioeconómico): el público es amplio, cualquiera que compre en supermercados y sienta la brecha de precios entre cadenas.

## Product Purpose

OfertAR es un asistente pasivo de ahorro para el hogar argentino. Escanea tickets de compra (OCR) para construir un historial de consumo real, y a partir de ese historial detecta ofertas personalizadas y calcula ahorros potenciales — en vez de requerir que el usuario compare precios manualmente cada vez.

## Positioning

A diferencia de un comparador de precios tradicional (que responde "¿cuál es el precio más bajo ahora?"), OfertAR responde "¿qué te conviene comprar la próxima vez, según lo que ya comprás?". El historial de tickets escaneados es el mecanismo central del producto; la comparación de precios en tiempo real es secundaria. Hoy esa jerarquía todavía no está reflejada en el código: `ComparePricesScreen` (la pantalla de comparación más usada) corre sobre datos mock, mientras que `ScanBarcodeScreen` (código de barras contra datos públicos de SEPA) es la única fuente de precios verificada. Migrar la comparación a datos reales, no al revés, es la dirección correcta.

## Operating Context

El usuario sale del supermercado, escanea el ticket en segundos, y antes de la próxima compra la app le avisa qué le conviene. El flujo no depende de que el usuario arme listas o busque precios activamente. La app corre como build nativo (o vía Expo Go en desarrollo) en iOS y Android, con un único lenguaje visual sin diferenciación por plataforma.

## Capabilities and Constraints

- OCR de tickets (foto o PDF) → extracción de productos/marcas/precios vía backend. Motor de OCR/IA aún no definido (Python propio vs. servicio externo, por README).
- Escaneo de producto individual por código de barras contra datos públicos de SEPA (con fecha de dataset y cantidad de sucursales) — hoy la única fuente de precios verificada.
- Comparación de precios (`ComparePricesScreen`) — todavía sobre datos mock, pendiente de conectar a una fuente real.
- Geolocalización real (react-native-maps + expo-location) para tiendas favoritas y comparar precios por zona.
- Sistema de referidos: cada usuario tiene un código propio; tanto quien invita como quien se registra ganan puntos, canjeables por beneficios. Hoy es frontend-only, sin persistencia real en un backend (no existe todavía columna de puntos/código de referido en el modelo de usuario).
- Backend real en Spring Boot + MySQL (repo separado `PP-ofertar`); frontend en Expo + React Native + TypeScript (`PP-ofertar-fe`), sin librería de navegación (máquina de estados en `App.tsx`) ni librería de manejo de estado global — son decisiones deliberadas del proyecto, no deuda a resolver sin más contexto.
- No existe todavía un modelo de suscripción real ni facturación. La recompensa de "descuento de suscripción" del sistema de puntos es aspiracional/ilustrativa por ahora, no un producto de pago real (ver Evidence on Hand y Product Principles).

## Brand Commitments

- Nombre del producto: **OfertAR**.
- Voz de marca: español argentino con voseo consistente en toda la copy — no traducido, no neutro.
- Paleta e identidad visual ya establecidas: navy/cyan/orange (`src/theme/designSystem.ts`), logo en `assets/logo_ofertar.png`.

## Evidence on Hand

- `README.md` documenta el problema con cifras: brecha de precios de hasta 50% entre cadenas de supermercados, 85% de los argentinos cambió hábitos de compra por inflación, uso de tarjeta de crédito para alimentos +43,1%.
- El roadmap "Deseables (post-MVP)" del README ya listaba explícitamente "Sistema de afiliados con código de invitación y recompensas" antes de esta sesión — el sistema de referidos construido responde directamente a ese ítem.
- No hay testimonios, casos de estudio, ni evidencia de usuarios reales todavía. Es un proyecto académico (Prácticas Profesionalizantes 3, Instituto Técnico de Formación Superior "Leopoldo Marechal", ciclo lectivo 2026), sin lanzamiento público. Ningún trabajo futuro debe inventar testimonios, métricas de usuarios reales, o casos de éxito.

## Product Principles

- El historial de consumo real (tickets escaneados) manda sobre cualquier dato inventado o mock. Cuando los dos compiten por ser "la" fuente de precios, el histórico real/verificado es hacia donde hay que migrar, no al revés.
- Pasivo antes que manual: cada feature nueva debería reducirle trabajo al usuario (comparar, buscar, armar listas), no agregarle un paso más.
- No fabricar lo que no existe. Sin un backend real detrás, una funcionalidad no debe aparentar estarlo — mock está bien, mock disfrazado de real no (ver el hallazgo del QR falso de ofertas, resuelto en esta sesión).
- Es un proyecto académico, no un producto en producción todavía. Features "post-MVP" (suscripción paga, afiliados, modo offline) son terreno legítimo para explorar, pero no deben tratarse como compromisos comerciales reales sin que el usuario lo confirme explícitamente.
