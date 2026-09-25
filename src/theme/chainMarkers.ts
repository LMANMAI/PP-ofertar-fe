
/**
 * Identidad visual de cada cadena en el mapa, en un solo lugar.
 *
 * El color por sí solo no alcanza: varias cadenas argentinas usan rojos casi
 * idénticos (Día / Coto / Disco) y azules casi idénticos (Carrefour / La
 * Anónima / Makro), así que una persona con daltonismo no puede separarlas.
 * Por eso cada cadena combina **forma + iniciales + color**: forma e iniciales
 * ya alcanzan sin ver un solo color.
 */
export type ChainMarkerShape =
	| "circle"
	| "roundedSquare"
	| "diamond"
	| "pill"
	| "leaf";

export type ChainMarkerConfig = {
	/** Silueta del pin. Dos cadenas de color parecido nunca comparten forma. */
	shape: ChainMarkerShape;
	/** 2–3 letras en alto contraste sobre el fondo del pin. */
	initials: string;
	/** Relleno del pin. Es el tercer canal, nunca el único. */
	color: string;
};

/**
 * Config por `chainSlug`. Regla al agregar una cadena: si su color se parece
 * al de otra ya listada, elegí una forma distinta (el script
 * `scripts/verifyChainMarkers.ts` lo verifica simulando deuteranopía).
 */
export const CHAIN_MARKERS: Record<string, ChainMarkerConfig> = {
	carrefour: { shape: "circle", initials: "CF", color: "#0E4C96" },
	dia: { shape: "roundedSquare", initials: "DIA", color: "#C4050F" },
	coto: { shape: "diamond", initials: "CO", color: "#B02318" },
	jumbo: { shape: "leaf", initials: "JU", color: "#1F7A33" },
	vea: { shape: "pill", initials: "VE", color: "#B87400" },
	disco: { shape: "circle", initials: "DS", color: "#A50D26" },
	changomas: { shape: "roundedSquare", initials: "CM", color: "#7B2D8B" },
	laanonima: { shape: "diamond", initials: "LA", color: "#00539B" },
	makro: { shape: "pill", initials: "MK", color: "#003DA5" },
};

/** Texto del pin: se elige el que más contraste da contra el relleno. */
export const MARKER_TEXT_LIGHT = "#FFFFFF";
export const MARKER_TEXT_DARK = "#0F172A";

/** Umbral WCAG AA para texto (el de los pines es bold ≥ 11px, no "large"). */
export const MIN_TEXT_CONTRAST = 4.5;

/** Umbral WCAG AA para componentes no textuales (el borde/halo del pin). */
export const MIN_SHAPE_CONTRAST = 3;

/**
 * Halo del pin. Casi blanco en los dos temas a propósito: despega el marcador
 * tanto del mapa claro como del `DARK_MAP_STYLE`, que es oscuro.
 */
export function markerHaloColor(isDark: boolean): string {
	return isDark ? "#E7ECF5" : "#FFFFFF";
}

/** Formas usadas para cadenas desconocidas, en orden determinístico. */
const FALLBACK_SHAPES: ChainMarkerShape[] = [
	"circle",
	"roundedSquare",
	"diamond",
	"pill",
	"leaf",
];

/** Grises azulados neutros: no pisan la identidad de ninguna cadena conocida. */
const FALLBACK_COLORS = ["#334155", "#475569", "#3F3F46", "#44403C"];

export type ChainMarkerDescriptor = {
	slug: string;
	shape: ChainMarkerShape;
	initials: string;
	/** Relleno del pin. */
	background: string;
	/** Color del texto, ya elegido por contraste contra `background`. */
	textColor: string;
	/** `false` cuando el slug no estaba en `CHAIN_MARKERS`. */
	known: boolean;
};

export function relativeLuminance(hex: string): number {
	const { r, g, b } = parseHex(hex);
	const channel = (v: number) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contraste WCAG 2.1 entre dos colores opacos (1 a 21). */
export function contrastRatio(a: string, b: string): number {
	const la = relativeLuminance(a);
	const lb = relativeLuminance(b);
	const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
	return (hi + 0.05) / (lo + 0.05);
}

/** Blanco o casi negro, el que más contraste dé contra el fondo del pin. */
export function pickTextColor(background: string): string {
	return contrastRatio(MARKER_TEXT_LIGHT, background) >=
		contrastRatio(MARKER_TEXT_DARK, background)
		? MARKER_TEXT_LIGHT
		: MARKER_TEXT_DARK;
}

export function parseHex(hex: string): { r: number; g: number; b: number } {
	const clean = hex.replace("#", "");
	const full =
		clean.length === 3
			? clean
					.split("")
					.map((c) => c + c)
					.join("")
			: clean;
	if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) {
		throw new Error(`Color hexadecimal inválido: ${hex}`);
	}
	return {
		r: parseInt(full.slice(0, 2), 16),
		g: parseInt(full.slice(2, 4), 16),
		b: parseInt(full.slice(4, 6), 16),
	};
}

/** Hash estable (djb2) para que un slug desconocido siempre caiga en el mismo pin. */
function hashString(value: string): number {
	let hash = 5381;
	for (let i = 0; i < value.length; i += 1) {
		hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
	}
	return hash;
}

/**
 * Iniciales legibles a partir del nombre (o del slug si no hay nombre):
 * dos palabras -> una letra de cada una; una sola palabra -> sus dos primeras.
 */
export function initialsFrom(source: string): string {
	const words = source
		.replace(/[_-]+/g, " ")
		.split(/\s+/)
		.map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
		.filter(Boolean);
	if (words.length === 0) return "?";
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
	return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Descriptor listo para pintar. Nunca tira: un slug desconocido cae en una
 * forma+color determinísticos y en las iniciales de su nombre.
 */
export function getChainMarker(
	chainSlug: string,
	chainName?: string,
): ChainMarkerDescriptor {
	const slug = (chainSlug ?? "").trim();
	const config = CHAIN_MARKERS[slug.toLowerCase()];
	if (config) {
		return {
			slug,
			shape: config.shape,
			initials: config.initials,
			background: config.color,
			textColor: pickTextColor(config.color),
			known: true,
		};
	}
	const seed = hashString(slug || chainName || "desconocida");
	const background = FALLBACK_COLORS[seed % FALLBACK_COLORS.length];
	return {
		slug,
		shape: FALLBACK_SHAPES[seed % FALLBACK_SHAPES.length],
		initials: initialsFrom(chainName?.trim() || slug || "?"),
		background,
		textColor: pickTextColor(background),
		known: false,
	};
}

/**
 * Texto para lectores de pantalla: cadena + sucursal + cómo se ve el pin, para
 * que quien no ve el mapa reciba la misma información que quien lo mira.
 */
export function markerAccessibilityLabel(
	descriptor: ChainMarkerDescriptor,
	chainName: string,
	storeName: string,
): string {
	const shape = SHAPE_LABELS[descriptor.shape];
	const letters = descriptor.initials.split("").join(" ");
	return `${chainName}: ${storeName}. Marcador ${shape} con las letras ${letters}`;
}

const SHAPE_LABELS: Record<ChainMarkerShape, string> = {
	circle: "circular",
	roundedSquare: "cuadrado",
	diamond: "rombo",
	pill: "ovalado",
	leaf: "de gota",
};
