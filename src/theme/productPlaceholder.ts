import type { ImageSourcePropType } from "react-native";

/**
 * Lo que se dibuja en una tarjeta de producto cuando no hay foto.
 *
 * Un solo archivo, siempre el mismo path: para cambiar el dibujo alcanza con
 * pisar `assets/product-placeholder.png`, sin tocar código. El que está hoy es
 * provisorio y se puede reemplazar por cualquier PNG cuadrado.
 *
 * Vive acá y no en la pantalla porque `require()` de un PNG sólo lo resuelve
 * el bundler: un archivo con imágenes no se puede importar desde Node, y los
 * scripts de `scripts/` tienen que poder importar la lógica sin levantar la
 * app. Misma razón que `chainLogos.ts`.
 */
export const PRODUCT_PLACEHOLDER: ImageSourcePropType = require("../../assets/product-placeholder.png");
