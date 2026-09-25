/**
 * Verificación de los marcadores de cadena del mapa (`src/theme/chainMarkers.ts`).
 *
 *   npx tsx scripts/verifyChainMarkers.ts
 *
 * El proyecto no tiene framework de tests, así que esto es un chequeo
 * ejecutable de la lógica pura detrás de los pines:
 *
 *   1. forma + iniciales identifican a cada cadena sin mirar el color;
 *   2. dos cadenas de color confundible (incluso simulando daltonismo)
 *      nunca comparten forma;
 *   3. el texto del pin supera 4.5:1 de contraste WCAG sobre su relleno, y el
 *      relleno supera 3:1 contra el halo, en tema claro y oscuro;
 *   4. un slug desconocido devuelve un descriptor válido y determinístico.
 *
 * Además corre "mutantes": copias deliberadamente rotas de la config con las
 * que se comprueba que los chequeos fallan cuando tienen que fallar. Si un
 * mutante pasa, el script falla igual que si fallara la config real.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import {
	CHAIN_MARKERS,
	MIN_SHAPE_CONTRAST,
	MIN_TEXT_CONTRAST,
	contrastRatio,
	getChainMarker,
	markerAccessibilityLabel,
	markerHaloColor,
	parseHex,
	type ChainMarkerDescriptor,
} from "../src/theme/chainMarkers";

/** ΔE76 por debajo del cual dos colores se consideran confundibles. */
const CONFUSABLE_DELTA_E = 25;

// ---------------------------------------------------------------- color math

function toLinear(channel: number): number {
	const s = channel / 255;
	return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function toLab(hex: string): [number, number, number] {
	const { r, g, b } = parseHex(hex);
	const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
	// sRGB D65 -> XYZ
	const x = (0.4124 * lr + 0.3576 * lg + 0.1805 * lb) / 0.95047;
	const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
	const z = (0.0193 * lr + 0.1192 * lg + 0.9505 * lb) / 1.08883;
	const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
	const [fx, fy, fz] = [f(x), f(y), f(z)];
	return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE76(a: string, b: string): number {
	const [l1, a1, b1] = toLab(a);
	const [l2, a2, b2] = toLab(b);
	return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

/** Matrices de Viénot/Brettel & Mollon (1999), aplicadas en RGB lineal. */
const CVD_MATRICES: Record<string, number[][]> = {
	protanopia: [
		[0.11238, 0.88762, 0.0],
		[0.11238, 0.88762, 0.0],
		[0.00401, -0.00401, 1.0],
	],
	deuteranopia: [
		[0.29275, 0.70725, 0.0],
		[0.29275, 0.70725, 0.0],
		[-0.02234, 0.02234, 1.0],
	],
	tritanopia: [
		[1.0, 0.1461, -0.1461],
		[0.0, 0.85659, 0.14341],
		[0.0, 0.85659, 0.14341],
	],
};

function simulateCvd(hex: string, kind: keyof typeof CVD_MATRICES): string {
	const { r, g, b } = parseHex(hex);
	const lin = [toLinear(r), toLinear(g), toLinear(b)];
	const m = CVD_MATRICES[kind];
	const out = m.map((row) => row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]);
	const encode = (v: number) => {
		const c = Math.min(1, Math.max(0, v));
		const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
		return Math.round(s * 255)
			.toString(16)
			.padStart(2, "0");
	};
	return `#${out.map(encode).join("")}`;
}

// -------------------------------------------------------------------- checks

type Failure = string;

/** Ninguna cadena puede quedar identificada por el mismo par forma+iniciales. */
function checkShapeInitialsUnique(pins: ChainMarkerDescriptor[]): Failure[] {
	const failures: Failure[] = [];
	const seen = new Map<string, string>();
	for (const pin of pins) {
		const key = `${pin.shape}|${pin.initials.toUpperCase()}`;
		const previous = seen.get(key);
		if (previous) {
			failures.push(
				`"${pin.slug}" y "${previous}" comparten forma+iniciales (${pin.shape} / ${pin.initials})`,
			);
		}
		seen.set(key, pin.slug);
		if (pin.initials.trim().length < 2 || pin.initials.length > 3) {
			failures.push(`"${pin.slug}" tiene iniciales inválidas: "${pin.initials}"`);
		}
	}
	return failures;
}

/** Las iniciales solas ya tienen que separar: es la señal que lee un lector de pantalla. */
function checkInitialsUnique(pins: ChainMarkerDescriptor[]): Failure[] {
	const failures: Failure[] = [];
	const seen = new Map<string, string>();
	for (const pin of pins) {
		const key = pin.initials.toUpperCase();
		const previous = seen.get(key);
		if (previous) failures.push(`"${pin.slug}" y "${previous}" usan las mismas iniciales "${key}"`);
		seen.set(key, pin.slug);
	}
	return failures;
}

/**
 * El chequeo central de daltonismo: si dos rellenos se confunden con visión
 * normal o simulando protanopía/deuteranopía/tritanopía, las formas tienen
 * que diferir. Reporta también el par más cercano de cada simulación.
 */
function checkConfusableColorsDifferInShape(pins: ChainMarkerDescriptor[], verbose: boolean): Failure[] {
	const failures: Failure[] = [];
	const modes: (keyof typeof CVD_MATRICES | "normal")[] = [
		"normal",
		"protanopia",
		"deuteranopia",
		"tritanopia",
	];
	for (const mode of modes) {
		let worst = { pair: "", delta: Infinity };
		for (let i = 0; i < pins.length; i += 1) {
			for (let j = i + 1; j < pins.length; j += 1) {
				const a = pins[i];
				const b = pins[j];
				const ca = mode === "normal" ? a.background : simulateCvd(a.background, mode);
				const cb = mode === "normal" ? b.background : simulateCvd(b.background, mode);
				const delta = deltaE76(ca, cb);
				if (delta < worst.delta) worst = { pair: `${a.slug}/${b.slug}`, delta };
				if (delta < CONFUSABLE_DELTA_E && a.shape === b.shape) {
					failures.push(
						`bajo ${mode}, "${a.slug}" y "${b.slug}" tienen colores confundibles ` +
							`(ΔE=${delta.toFixed(1)} < ${CONFUSABLE_DELTA_E}) y además la misma forma "${a.shape}"`,
					);
				}
			}
		}
		if (verbose) {
			console.log(
				`   ${mode.padEnd(13)} par de colores más cercano: ${worst.pair} (ΔE=${worst.delta.toFixed(1)})`,
			);
		}
	}
	return failures;
}

/** Contraste WCAG del texto sobre el relleno y del relleno contra el halo. */
function checkContrast(pins: ChainMarkerDescriptor[], verbose: boolean): Failure[] {
	const failures: Failure[] = [];
	for (const pin of pins) {
		const text = contrastRatio(pin.textColor, pin.background);
		const haloLight = contrastRatio(pin.background, markerHaloColor(false));
		const haloDark = contrastRatio(pin.background, markerHaloColor(true));
		if (verbose) {
			console.log(
				`   ${pin.slug.padEnd(11)} ${pin.background} ${pin.initials.padEnd(3)} ` +
					`texto ${text.toFixed(2)}:1  halo claro ${haloLight.toFixed(2)}:1  halo oscuro ${haloDark.toFixed(2)}:1`,
			);
		}
		if (text < MIN_TEXT_CONTRAST) {
			failures.push(
				`"${pin.slug}": texto ${pin.textColor} sobre ${pin.background} da ${text.toFixed(2)}:1 (< ${MIN_TEXT_CONTRAST})`,
			);
		}
		if (haloLight < MIN_SHAPE_CONTRAST) {
			failures.push(
				`"${pin.slug}": relleno vs halo en tema claro ${haloLight.toFixed(2)}:1 (< ${MIN_SHAPE_CONTRAST})`,
			);
		}
		if (haloDark < MIN_SHAPE_CONTRAST) {
			failures.push(
				`"${pin.slug}": relleno vs halo en tema oscuro ${haloDark.toFixed(2)}:1 (< ${MIN_SHAPE_CONTRAST})`,
			);
		}
	}
	return failures;
}

/** Slugs que el backend puede mandar y no están en la config. */
function checkUnknownChains(verbose: boolean): Failure[] {
	const failures: Failure[] = [];
	const shapes = new Set(Object.values(CHAIN_MARKERS).map((c) => c.shape));
	const cases: [string, string | undefined][] = [
		["supermercados-nuevos", "Supermercados Nuevos"],
		["mami", "Mami"],
		["", undefined],
		["   ", "  "],
		["CARREFOUR", "Carrefour"], // mismo slug en mayúsculas: tiene que caer en la config real
		["日本スーパー", "日本 スーパー"],
		["x", undefined],
	];
	for (const [slug, name] of cases) {
		let pin: ChainMarkerDescriptor;
		try {
			pin = getChainMarker(slug, name);
		} catch (err) {
			failures.push(`getChainMarker("${slug}") tiró: ${String(err)}`);
			continue;
		}
		if (verbose) {
			console.log(
				`   "${slug}" -> ${pin.shape}/${pin.initials}/${pin.background} (known=${pin.known})`,
			);
		}
		if (!pin.initials || pin.initials.trim().length === 0) {
			failures.push(`getChainMarker("${slug}") devolvió iniciales vacías`);
		}
		if (!shapes.has(pin.shape) && !["circle", "roundedSquare", "diamond", "pill", "leaf"].includes(pin.shape)) {
			failures.push(`getChainMarker("${slug}") devolvió una forma desconocida: ${pin.shape}`);
		}
		const text = contrastRatio(pin.textColor, pin.background);
		if (text < MIN_TEXT_CONTRAST) {
			failures.push(
				`getChainMarker("${slug}"): contraste del texto ${text.toFixed(2)}:1 (< ${MIN_TEXT_CONTRAST})`,
			);
		}
		const again = getChainMarker(slug, name);
		if (again.shape !== pin.shape || again.background !== pin.background || again.initials !== pin.initials) {
			failures.push(`getChainMarker("${slug}") no es determinístico`);
		}
	}
	if (getChainMarker("CARREFOUR", "Carrefour").shape !== CHAIN_MARKERS.carrefour.shape) {
		failures.push('un slug conocido en mayúsculas ("CARREFOUR") no matcheó la config');
	}
	return failures;
}

/** La etiqueta de accesibilidad tiene que nombrar cadena, sucursal y forma. */
function checkAccessibilityLabels(verbose: boolean): Failure[] {
	const failures: Failure[] = [];
	const label = markerAccessibilityLabel(getChainMarker("coto", "Coto"), "Coto", "Coto Palermo");
	if (verbose) console.log(`   ${label}`);
	for (const needle of ["Coto", "Coto Palermo", "rombo", "C O"]) {
		if (!label.includes(needle)) failures.push(`la etiqueta accesible no menciona "${needle}": ${label}`);
	}
	const unknown = markerAccessibilityLabel(
		getChainMarker("mami", "Mami Supermercados"),
		"Mami Supermercados",
		"Mami Centro",
	);
	if (verbose) console.log(`   ${unknown}`);
	if (!unknown.includes("Mami Supermercados") || !unknown.includes("Mami Centro")) {
		failures.push(`la etiqueta accesible de una cadena desconocida es incompleta: ${unknown}`);
	}
	return failures;
}

// ------------------------------------------------------------------- harness

function realPins(): ChainMarkerDescriptor[] {
	return Object.keys(CHAIN_MARKERS).map((slug) => getChainMarker(slug));
}

function runAllChecks(pins: ChainMarkerDescriptor[], verbose: boolean): Failure[] {
	return [
		...checkShapeInitialsUnique(pins),
		...checkInitialsUnique(pins),
		...checkConfusableColorsDifferInShape(pins, verbose),
		...checkContrast(pins, verbose),
	];
}

function clone(pins: ChainMarkerDescriptor[]): ChainMarkerDescriptor[] {
	return pins.map((p) => ({ ...p }));
}

/** Config rota a propósito -> el chequeo tiene que atraparla. */
type Mutant = { name: string; build: () => ChainMarkerDescriptor[] };

const MUTANTS: Mutant[] = [
	{
		name: "coto copia la forma de dia (dos rojos con la misma silueta)",
		build: () => {
			const pins = clone(realPins());
			const dia = pins.find((p) => p.slug === "dia")!;
			pins.find((p) => p.slug === "coto")!.shape = dia.shape;
			return pins;
		},
	},
	{
		name: "vea usa texto blanco sobre naranja (contraste bajo)",
		build: () => {
			const pins = clone(realPins());
			pins.find((p) => p.slug === "vea")!.textColor = "#FFFFFF";
			return pins;
		},
	},
	{
		name: "disco reusa las iniciales de dia",
		build: () => {
			const pins = clone(realPins());
			pins.find((p) => p.slug === "disco")!.initials = "DIA";
			return pins;
		},
	},
	{
		name: "makro se pinta casi blanco (se pierde contra el halo)",
		build: () => {
			const pins = clone(realPins());
			const makro = pins.find((p) => p.slug === "makro")!;
			makro.background = "#F7F9FC";
			makro.textColor = "#FFFFFF";
			return pins;
		},
	},
];


/**
 * Los logos reales viven en `chainLogos.ts`, cuyos `require()` sólo resuelve el
 * bundler: importarlo desde Node fallaría. Se lee como texto, que es la única
 * manera de comprobar acá que cada ruta apunta a un archivo que existe. Un
 * nombre mal escrito, o con otra mayúscula (en Android importa), compila igual
 * y recién revienta en el dispositivo.
 */
function checkLogoAssets(verbose: boolean): Failure[] {
	const failures: Failure[] = [];
	const logosPath = resolve(__dirname, "..", "src", "theme", "chainLogos.ts");
	if (!existsSync(logosPath)) return ["no existe src/theme/chainLogos.ts"];

	const source = readFileSync(logosPath, "utf8");
	const entries = [...source.matchAll(/(\w+):\s*require\("([^"]+)"\)/g)].map((m) => ({
		slug: m[1],
		ref: m[2],
	}));
	if (entries.length === 0) failures.push("chainLogos.ts no declara ningun logo");

	for (const { slug, ref } of entries) {
		// Comparado contra el listado real del directorio y no con existsSync:
		// en Windows el sistema de archivos ignora las mayusculas, asi que
		// "coto.jpg" pasaria y despues fallaria en Android, que no las ignora.
		const dir = resolve(__dirname, "..", "src", "theme", ref, "..");
		const base = ref.split("/").pop() ?? "";
		const presentes = existsSync(dir) ? readdirSync(dir) : [];
		if (!presentes.includes(base)) {
			const parecido = presentes.find((f) => f.toLowerCase() === base.toLowerCase());
			failures.push(
				parecido
					? `el logo de "${slug}" dice "${base}" pero el archivo es "${parecido}": Android distingue mayusculas`
					: `el logo de "${slug}" apunta a un archivo inexistente: ${ref}`,
			);
		} else if (verbose) {
			console.log(`   ${slug.padEnd(11)} ${ref.split("/").pop()}`);
		}
		// Si la imagen no carga, el pin cae a forma + iniciales. Una cadena con
		// logo pero sin entrada en CHAIN_MARKERS quedaria dibujada vacia.
		if (!CHAIN_MARKERS[slug]) {
			failures.push(`"${slug}" tiene logo pero no esta en CHAIN_MARKERS: se queda sin fallback`);
		}
	}

	if (verbose) {
		const sinLogo = Object.keys(CHAIN_MARKERS).filter((slug) => !entries.some((e) => e.slug === slug));
		if (sinLogo.length > 0) console.log(`   sin logo (usan forma + iniciales): ${sinLogo.join(", ")}`);
	}
	return failures;
}

function main() {
	let failed = false;

	console.log(`Cadenas configuradas: ${Object.keys(CHAIN_MARKERS).length}`);
	console.log("\n[1] Forma + iniciales únicas por cadena");
	const pins = realPins();
	const identity = [...checkShapeInitialsUnique(pins), ...checkInitialsUnique(pins)];
	for (const pin of pins) console.log(`   ${pin.slug.padEnd(11)} ${pin.shape.padEnd(13)} ${pin.initials}`);
	failed = report(identity) || failed;

	console.log("\n[2] Colores confundibles (simulando daltonismo) -> formas distintas");
	failed = report(checkConfusableColorsDifferInShape(pins, true)) || failed;

	console.log("\n[3] Contraste WCAG del texto y del halo");
	failed = report(checkContrast(pins, true)) || failed;

	console.log("\n[4] Cadenas desconocidas");
	failed = report(checkUnknownChains(true)) || failed;

	console.log("\n[5] Etiquetas de accesibilidad");
	failed = report(checkAccessibilityLabels(true)) || failed;

	console.log("");
	console.log("[6] Logos de cadena: el archivo existe y el fallback sigue en pie");
	failed = report(checkLogoAssets(true)) || failed;

	console.log("\n[7] Mutantes: la implementación rota tiene que ser detectada");
	for (const mutant of MUTANTS) {
		const found = runAllChecks(mutant.build(), false);
		if (found.length === 0) {
			console.log(`   NO DETECTADO: ${mutant.name}`);
			failed = true;
		} else {
			console.log(`   detectado: ${mutant.name}`);
			console.log(`      -> ${found[0]}`);
		}
	}

	console.log(failed ? "\nRESULTADO: FALLÓ" : "\nRESULTADO: OK");
	if (failed) process.exitCode = 1;
}

function report(failures: Failure[]): boolean {
	if (failures.length === 0) {
		console.log("   OK");
		return false;
	}
	for (const failure of failures) console.log(`   FALLA: ${failure}`);
	return true;
}

main();
