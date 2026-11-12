import { markerHaloColor } from "../theme/chainMarkers";

/**
 * Cómo se ve en el mapa una sucursal cerrada ahora.
 *
 * Se atenúa por tamaño y por orden (más chica, y abajo de las abiertas), no por
 * opacidad ni por color: un pin transparente mezcla su relleno con el mapa y
 * pierde el contraste de texto y halo que controla `scripts/verifyChainMarkers.ts`.
 * La forma, las iniciales y el color de la cadena quedan intactos, y una marca
 * oscura con una luna dice "cerrado" sin depender del color.
 * `scripts/verifyOpeningHours.ts` controla el contraste de esa marca.
 */
export const OPEN_MARKER_SIZE = 32;
export const CLOSED_MARKER_SIZE = 26;

export const CLOSED_BADGE = {
	/** Relleno de la marca: gris pizarra, se lee sobre el halo casi blanco. */
	fill: "#1F2937",
	/** La luna. */
	glyph: "#FFFFFF",
	size: 14,
} as const;

/** El aro de la marca es el mismo halo del pin, en los dos temas. */
export const markerHaloColorFor = markerHaloColor;
