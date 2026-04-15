# OfertAR

> Asistente de ahorro inteligente para el hogar argentino

OfertAR automatiza el proceso de ahorro mediante el escaneo inteligente de tickets de compra (OCR), transformando datos estáticos en papel en información accionable. A diferencia de los comparadores de precios tradicionales, OfertAR actúa como un asistente pasivo que analiza el historial de consumo real del usuario para detectar ofertas personalizadas y calcular ahorros potenciales en tiempo real.

---

## Contexto institucional

| Campo | Detalle |
|---|---|
| Institución | Instituto Técnico de Formación Superior "Leopoldo Marechal" |
| Carrera | Tecnicatura en Desarrollo de Software |
| Espacio Curricular | Prácticas Profesionalizantes 3 (PP3) |
| Ciclo Lectivo | 2026 |
| Docente | Mauro Julián Ayala |

---

## El problema

Los consumidores argentinos enfrentan una **brecha de precios de hasta el 50%** en un mismo producto entre distintas cadenas de supermercados. El registro de gastos es inexistente o manual (fotos de tickets, notas), lo que impide un análisis real del costo de vida.

- El **85% de los argentinos** ha cambiado sus hábitos de compra a causa de la inflación
- El uso de tarjetas de crédito para alimentos creció un **43,1%**
- Las consecuencias: fatiga de decisión, estrés financiero y pérdida sistemática del poder adquisitivo

---

## Solución

Mobile app nativa (iOS / Android) construida con **Expo + React Native + TypeScript**.

**Flujo principal:**
1. El usuario sale del supermercado y escanea su ticket en segundos
2. Un motor de IA extrae productos, marcas y precios, generando un historial de consumo real
3. Antes de la próxima compra, la app notifica: *"Tu marca de leche favorita está un 20% más barata en el supermercado X"*
4. El usuario planifica su ruta de ahorro de forma automática

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Mobile | React Native 0.81 + Expo 54 |
| Lenguaje | TypeScript 5.9 (strict mode) |
| Runtime | Node.js 22 |
| OCR / IA | A definir (motor Python propio vs. servicio externo) |
| Auth | Nativa + Google Auth |

---

## Funcionalidades

### MVP — Prioridad 1 (core)

- [ ] Registro y autenticación (nativa y Google Auth)
- [ ] Escaneo de ticket físico / subida de PDF con procesamiento OCR + LLM → JSON
- [ ] Geolocalización para comparar precios por zona
- [ ] Análisis y categorización de productos
- [ ] Escaneo de productos individuales por código de barras

### MVP — Prioridad 2

- [ ] Recorrido inicial (onboarding) de la aplicación

### MVP — Prioridad 3

- [ ] Comparador de precios (carrito completo y productos individuales)
- [ ] Notificaciones push de descuentos y promociones

### Deseables (post-MVP)

- [ ] Trackeo de precios de productos a lo largo del tiempo (últimos 3 meses)
- [ ] Comparador extendido (combustible, comercios puntuales, etc.)
- [ ] Descuentos por tarjeta bancaria
- [ ] Productos alternativos / marcas propias como sugerencia de ahorro
- [ ] Carrito manual: el usuario arma su lista sin necesidad de escanear
- [ ] Comparación entre los últimos 2 tickets para detectar productos faltantes
- [ ] Bot para responder preguntas frecuentes
- [ ] Modo offline con caché local
- [ ] Sistema de afiliados con código de invitación y recompensas
- [ ] Rewards: intercambio de cupones recibidos en caja

---

## Estructura del proyecto

```
ofertar-app/
├── App.tsx              # Componente raíz
├── index.ts             # Entry point
├── app.json             # Configuración Expo
├── tsconfig.json        # Configuración TypeScript
├── assets/              # Imágenes y fuentes
└── src/                 # (por estructurar)
    ├── screens/
    ├── components/
    ├── navigation/
    ├── services/
    └── store/
```

---

## Inicio rápido

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo (genera QR para Expo Go)
npm start

# Correr en emulador Android
npm run android

# Correr en navegador
npm run web
```

---

## Impacto estimado

> Ahorros tangibles de **$1.799 detectados en una sola compra promedio**, acumulables mes a mes, devolviendo el control financiero a los hogares con un esfuerzo mínimo del usuario.

---

## Referencias

- [Figma]([https://www.reddit.com/r/devsarg/comments/18n81fc/web_para_buscar_el_mejor_precio_en_los/](https://www.figma.com/deck/PrBPgXyBzzwoPLDoelUE3H))
<<<<<<< HEAD
=======
test backport
test2
test3
>>>>>>> 9488cbd (Merge pull request #3 from LMANMAI/test/backport-probe-3)
