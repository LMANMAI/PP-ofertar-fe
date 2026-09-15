import type { ImageSourcePropType } from "react-native";

/**
 * Los logos reales de cada cadena.
 *
 * Viven acá y no en `chainMarkers.ts` a propósito: `require()` de un PNG sólo
 * lo resuelve el bundler, así que un archivo con imágenes no se puede importar
 * desde Node — y `chainMarkers.ts` tiene que seguir siendo importable para que
 * `scripts/verifyChainMarkers.ts` pueda verificar formas, iniciales y
 * contraste sin levantar la app.
 *
 * Las rutas se escriben literales porque Metro no resuelve `require()` armado
 * en tiempo de ejecución. Las mayúsculas importan: Android distingue.
 *
 * Una cadena sin entrada acá no es un error — cae al pin de forma + iniciales,
 * que es lo que hoy pasa con La Anónima.
 */
export const CHAIN_LOGOS: Record<string, ImageSourcePropType> = {
	carrefour: require("../../assets/chains/carrefour.png"),
	changomas: require("../../assets/chains/changomas.jpg"),
	coto: require("../../assets/chains/Coto.jpg"),
	dia: require("../../assets/chains/Dia.png"),
	disco: require("../../assets/chains/Disco.png"),
	jumbo: require("../../assets/chains/Jumbo.png"),
	makro: require("../../assets/chains/makro.jpg"),
	vea: require("../../assets/chains/Vea.png"),
};

/** El logo de una cadena, con la misma normalización de slug que usa
 * `getChainMarker`, o null si no hay archivo para ella. */
export function chainLogo(chainSlug: string | null | undefined): ImageSourcePropType | null {
	const slug = (chainSlug ?? "").trim().toLowerCase();
	return CHAIN_LOGOS[slug] ?? null;
}
