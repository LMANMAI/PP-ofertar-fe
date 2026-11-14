/**
 * Dónde va cada paso del tour. Módulo aparte, sin React Native, porque es la regla que garantiza
 * que los botones del tour siempre se puedan tocar: en ningún teléfono la tarjeta puede quedar
 * fuera de la pantalla, sea cual sea el tamaño, la escala de letra o dónde esté el destino.
 */
export type TourRect = { x: number; y: number; width: number; height: number };

type Input = {
	spotlight: TourRect | null;
	/** Tamaño real de la capa del tour, no el de la ventana: en Android pueden ser distintos. */
	container: { width: number; height: number };
	/** Alto medido de la tarjeta, que depende del texto y de la escala de letra del teléfono. */
	tooltipHeight: number;
	insets: { top: number; bottom: number };
};

export type TooltipPlacement = {
	top: number;
	left: number;
	width: number;
	maxHeight: number;
	/** La tarjeta queda arriba del destino, con la flecha abajo. */
	above: boolean;
	/** Sin flecha cuando la tarjeta tuvo que correrse: apuntaría a cualquier lado. */
	showArrow: boolean;
	arrowLeft: number;
};

const MAX_WIDTH = 300;
const MARGIN = 18;
const GAP = 18;
const ARROW_SIZE = 18;
const ARROW_INSET = 24;
/** Sin destino medido todavía, la tarjeta va cerca de la parte alta de la pantalla. */
const DEFAULT_TOP = 180;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));

export function placeTooltip({ spotlight, container, tooltipHeight, insets }: Input): TooltipPlacement {
	const width = Math.min(MAX_WIDTH, container.width - MARGIN * 2);
	const minTop = insets.top + MARGIN;
	const maxBottom = container.height - insets.bottom - MARGIN;
	const maxHeight = Math.max(0, maxBottom - minTop);
	const height = Math.min(tooltipHeight, maxHeight);
	const maxTop = maxBottom - height;

	if (!spotlight) {
		return {
			top: clamp(DEFAULT_TOP, minTop, maxTop),
			left: clamp(MARGIN, MARGIN, container.width - width - MARGIN),
			width,
			maxHeight,
			above: false,
			showArrow: false,
			arrowLeft: ARROW_INSET,
		};
	}

	const spaceBelow = maxBottom - (spotlight.y + spotlight.height + GAP);
	const spaceAbove = spotlight.y - GAP - minTop;
	const above = spaceBelow < height && (spaceAbove >= height || spaceAbove > spaceBelow);
	const wanted = above ? spotlight.y - GAP - height : spotlight.y + spotlight.height + GAP;
	const top = clamp(wanted, minTop, maxTop);
	const left = clamp(spotlight.x, MARGIN, container.width - width - MARGIN);

	return {
		top,
		left,
		width,
		maxHeight,
		above,
		showArrow: top === wanted,
		arrowLeft: clamp(spotlight.x - left + spotlight.width / 2 - ARROW_SIZE / 2, ARROW_INSET, width - ARROW_INSET - ARROW_SIZE),
	};
}

/** Lo mínimo que hay que desplazar la pantalla para que el destino quede arriba de la barra de abajo. */
export function revealDelta(targetBottom: number, visibleBottom: number): number {
	return Math.max(0, targetBottom + GAP - visibleBottom);
}
