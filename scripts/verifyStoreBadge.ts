/**
 * El círculo que identifica al súper en las tarjetas de oferta.
 *
 *   npx tsx scripts/verifyStoreBadge.ts
 *
 * Los chequeos son sobre el texto del componente, no sobre su render: es JSX
 * de React Native y no se puede montar desde Node, y `chainLogos.ts` tiene
 * `require()` de PNG que sólo resuelve el bundler. Aun así, lo que se verifica
 * acá son las tres cosas que romperían la función entera sin que nada avise.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let failures = 0;
function check(name: string, fn: () => void): void {
	try {
		fn();
		console.log(`  ok   ${name}`);
	} catch (err) {
		failures++;
		console.log(`  FAIL ${name}`);
		console.log(`       ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
	}
}

const source = readFileSync(
	resolve(__dirname, "..", "src", "components", "ui", "StoreBadge.tsx"),
	"utf8",
);

console.log("StoreBadge: el logo de la cadena dentro de un círculo");

check("el logo se busca por slug y no por nombre", () => {
	// offerBadge() toma el nombre para las iniciales; chainLogo() necesita el
	// slug. Pasarle el nombre compila igual y deja el logo en null siempre,
	// o sea la función entera apagada sin un solo error.
	assert.match(source, /chainLogo\(retailerSlug\)/);
});

check("el logo entra dentro del círculo sin que se le corten las esquinas", () => {
	// Un cuadrado inscripto en un círculo mide 1/√2 de su diámetro. Por encima
	// de eso las esquinas del archivo caen fuera y se recortan: invisible en un
	// logo con fondo blanco, pero no en uno con transparencia.
	const scale = Number(source.match(/const LOGO_SCALE = ([\d.]+);/)?.[1]);
	assert.ok(Number.isFinite(scale), "no encontré LOGO_SCALE");
	assert.ok(
		scale <= 1 / Math.SQRT2,
		`${scale} pasa el máximo inscripto de ${(1 / Math.SQRT2).toFixed(3)}: se recortan las esquinas`,
	);
	assert.ok(scale > 0.4, `${scale} deja el logo ilegible dentro del badge`);
});

check("el badge recorta al círculo como red de contención", () => {
	assert.match(source, /overflow:\s*"hidden"/);
});

check("con logo el fondo es claro, no el color de hash", () => {
	// Casi todos los archivos son opacos sobre blanco: sobre el relleno de
	// color se ven como un parche pegado.
	const fill = source.match(/withLogo:\s*\{[^}]*backgroundColor:\s*"(#[0-9A-Fa-f]{6})"/)?.[1];
	assert.ok(fill, "withLogo no define backgroundColor");
	const lin = (c: number) => {
		const v = c / 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	};
	const n = parseInt(fill.slice(1), 16);
	const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
	assert.ok(lum > 0.7, `${fill} no es claro (luminancia ${lum.toFixed(2)})`);
});

check("el color de la cadena sobrevive como aro", () => {
	// Es lo único que queda del canal de color cuando el relleno pasa a blanco.
	assert.match(source, /borderColor:\s*color/);
	const width = Number(source.match(/borderWidth:\s*([\d.]+)/)?.[1]);
	assert.ok(width > 0, `borderWidth ${width}: sin aro no queda ninguna señal de color`);
});

check("sin logo se mantienen las iniciales sobre el color", () => {
	// Hay cadenas sin archivo (La Anónima) y el badge tiene que seguir sirviendo.
	assert.match(source, /backgroundColor:\s*color/);
	assert.match(source, /\{badge\}/);
});

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
