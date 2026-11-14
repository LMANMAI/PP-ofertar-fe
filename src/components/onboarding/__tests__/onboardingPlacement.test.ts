import { describe, expect, it } from "vitest";
import { placeTooltip, revealDelta, type TourRect } from "../onboardingPlacement";

const PHONES = [
	{ width: 280, height: 653 }, // plegable cerrado
	{ width: 320, height: 568 }, // chico
	{ width: 360, height: 640 },
	{ width: 390, height: 844 },
	{ width: 430, height: 932 },
	{ width: 768, height: 1024 }, // tablet
];
const INSETS = [
	{ top: 0, bottom: 0 },
	{ top: 47, bottom: 34 },
];
const TOOLTIP_HEIGHTS = [190, 260, 420]; // la última, con la letra del teléfono muy grande

/** Destinos arriba, al medio, debajo del pliegue y muy por debajo (el bug original). */
function targetsFor(height: number): TourRect[] {
	return [
		{ x: 20, y: 100, width: 300, height: 160 },
		{ x: 20, y: height / 2, width: 300, height: 40 },
		{ x: 0, y: height - 70, width: 360, height: 70 },
		{ x: 20, y: height + 300, width: 300, height: 40 },
		{ x: 20, y: height * 3, width: 300, height: 40 },
		{ x: 20, y: -200, width: 300, height: 40 },
	];
}

describe("placeTooltip", () => {
	it("la tarjeta entra entera en cualquier teléfono, escala de letra y destino", () => {
		for (const container of PHONES) {
			for (const insets of INSETS) {
				for (const tooltipHeight of TOOLTIP_HEIGHTS) {
					for (const spotlight of [null, ...targetsFor(container.height)]) {
						const p = placeTooltip({ spotlight, container, tooltipHeight, insets });
						const height = Math.min(tooltipHeight, p.maxHeight);
						const what = JSON.stringify({ container, insets, tooltipHeight, spotlight, p });
						expect(p.top, what).toBeGreaterThanOrEqual(insets.top);
						expect(p.top + height, what).toBeLessThanOrEqual(container.height - insets.bottom);
						expect(p.left, what).toBeGreaterThanOrEqual(0);
						expect(p.left + p.width, what).toBeLessThanOrEqual(container.width);
					}
				}
			}
		}
	});

	it("un destino debajo de la pantalla no lleva la tarjeta con él", () => {
		const container = { width: 360, height: 640 };
		const p = placeTooltip({
			spotlight: { x: 20, y: 950, width: 300, height: 40 },
			container,
			tooltipHeight: 190,
			insets: { top: 0, bottom: 0 },
		});
		expect(p.top + 190).toBeLessThanOrEqual(640);
		expect(p.showArrow).toBe(false);
	});

	it("con lugar, va debajo del destino y con flecha", () => {
		const p = placeTooltip({
			spotlight: { x: 20, y: 100, width: 300, height: 100 },
			container: { width: 390, height: 844 },
			tooltipHeight: 190,
			insets: { top: 47, bottom: 34 },
		});
		expect(p.above).toBe(false);
		expect(p.top).toBe(218);
		expect(p.showArrow).toBe(true);
	});

	it("con un destino abajo, va arriba de él", () => {
		const p = placeTooltip({
			spotlight: { x: 0, y: 750, width: 390, height: 60 },
			container: { width: 390, height: 844 },
			tooltipHeight: 190,
			insets: { top: 47, bottom: 34 },
		});
		expect(p.above).toBe(true);
		expect(p.top).toBe(542);
	});

	it("una tarjeta más alta que la pantalla se limita y deja el resto al scroll interno", () => {
		const p = placeTooltip({
			spotlight: null,
			container: { width: 320, height: 300 },
			tooltipHeight: 500,
			insets: { top: 20, bottom: 20 },
		});
		expect(p.maxHeight).toBe(224);
		expect(p.top).toBe(38);
	});

	it("la flecha nunca se sale de la tarjeta", () => {
		const p = placeTooltip({
			spotlight: { x: 340, y: 100, width: 40, height: 40 },
			container: { width: 390, height: 844 },
			tooltipHeight: 190,
			insets: { top: 0, bottom: 0 },
		});
		expect(p.arrowLeft).toBeLessThanOrEqual(p.width - 42);
	});
});

describe("revealDelta", () => {
	it("no desplaza lo que ya se ve", () => {
		expect(revealDelta(400, 700)).toBe(0);
	});

	it("desplaza lo justo para dejarlo arriba de la barra", () => {
		expect(revealDelta(900, 700)).toBe(218);
	});
});
