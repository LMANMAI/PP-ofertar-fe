/**
 * Que el detalle de oferta abra con la oferta que el usuario toco.
 *
 *   npx tsx scripts/verifyOfferDetailRouting.ts
 *
 * El bug que motiva esto: "Ofertas para vos" muestra su propia lista, paginada
 * y filtrada, mientras que el router resuelve el detalle contra otra lista —una
 * sola pagina, sin filtros—. Tocando una oferta de la pagina 2, o cualquiera
 * traida por un filtro de cadena, el detalle no la encontraba y mostraba
 * "No encontramos esta oferta" sobre algo que estaba en pantalla.
 *
 * Se verifican las dos mitades, porque arreglar una sola no alcanza:
 *   1. la resolucion acepta la oferta que viene de la pantalla (resolveOffer);
 *   2. cada pantalla efectivamente se la manda (chequeo sobre el fuente).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveOffer } from "../src/services/offersApi";
import type { Offer } from "../src/services/offersApi";

const here = dirname(fileURLToPath(import.meta.url));
const src = (...p: string[]) => readFileSync(resolve(here, "..", ...p), "utf8");

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

function offer(id: string): Offer {
	return {
		id,
		kind: "catalog",
		retailerSlug: "makro",
		retailerName: "Makro",
		headline: "-25%",
		productName: `Producto ${id}`,
		brand: null,
		category: null,
		price: 100,
		listPrice: 133,
		discountPct: 25,
		imageUrl: null,
		url: null,
		province: null,
		activeTo: null,
		legalText: "Legales de prueba",
		percentagesUnverified: false,
	};
}

console.log("Resolucion de la oferta del detalle");

check("la que esta en la lista del router se encuentra", () => {
	const lista = [offer("a"), offer("b")];
	assert.equal(resolveOffer(lista, "b", null)?.id, "b");
});

check("la que NO esta en esa lista se encuentra por la que mando la pantalla", () => {
	// Es el caso del bug: pagina 2, o filtrada por cadena. La lista del router
	// no la tiene y sin el fallback el detalle abria vacio.
	const lista = [offer("a")];
	assert.equal(resolveOffer(lista, "z", offer("z"))?.id, "z");
});

check("sin lista ni fallback no se inventa nada", () => {
	assert.equal(resolveOffer([], "z", null), null);
});

check("un fallback de otra oferta no se cuela", () => {
	// Si no se comparara el id, el detalle mostraria la oferta anterior con los
	// legales de otra: peor que el cartel de error.
	assert.equal(resolveOffer([], "z", offer("otra")), null);
});

check("sin id no hay nada que resolver", () => {
	assert.equal(resolveOffer([offer("a")], null, offer("a")), null);
});

check("la lista del router gana sobre el fallback", () => {
	// Misma oferta por los dos lados: vale la del router, que es la que se
	// refresca. El fallback es una copia congelada del momento del tap.
	const delRouter = { ...offer("a"), price: 111 };
	assert.equal(resolveOffer([delRouter], "a", offer("a"))?.price, 111);
});

console.log("\nCada pantalla manda la oferta, no solo el id");

const pantallas: [string, string[], string][] = [
	["OffersScreen", ["src", "screens", "OffersScreen.tsx"], "onOpenOffer(offer.id, offer)"],
	["HomeScreen", ["src", "screens", "HomeScreen.tsx"], "onOpenOffer(o.id, o)"],
	["RecurringProductsScreen", ["src", "screens", "RecurringProductsScreen.tsx"], "onOpenOffer?.(full.id, full)"],
];

for (const [nombre, partes, llamada] of pantallas) {
	check(`${nombre} manda la oferta entera`, () => {
		assert.ok(
			src(...partes).includes(llamada),
			`${nombre} tiene que llamar \`${llamada}\`; con el id solo el detalle abre vacio`,
		);
	});
}

check("ninguna pantalla abre el detalle con el id pelado", () => {
	// La red que atrapa una pantalla nueva que copie el patron viejo, o una
	// vieja a la que le saquen el segundo argumento.
	const sospechosas = /onOpenOffer\??\.?\(\s*[A-Za-z0-9_.]+\.id\s*\)/;
	for (const [nombre, partes] of pantallas.map(([n, p]) => [n, p] as [string, string[]])) {
		// Sin los comentarios: OffersScreen explica en uno por que la card recibe
		// el callback y no una closure ya atada, y cita `onOpenOffer(o.id)` como
		// ejemplo. Es prosa, no una llamada, y hacia fallar este check.
		const lineas = src(...partes).split(/\r?\n/);
		const texto = lineas.filter((linea) => !/^\s*(\/\/|\*|\/\*)/.test(linea)).join(" ");
		assert.ok(!sospechosas.test(texto), `${nombre} abre el detalle con el id solo`);
	}
});

check("el router resuelve con resolveOffer y no con su propia copia", () => {
	// La logica vivia inline en App.tsx, donde no habia forma de ejercitarla.
	// Si vuelve a duplicarse ahi, estos checks dejan de cubrir lo que corre.
	const app = src("App.tsx");
	assert.match(app, /resolveOffer\(offers, id, fallbackOffer\)/);
	assert.ok(
		!/offers\.find\(\(o\) => o\.id === id\)/.test(app),
		"App.tsx volvio a resolver la oferta por su cuenta",
	);
});

check("el router sigue aceptando el fallback al abrir", () => {
	const app = src("App.tsx");
	assert.match(app, /const openOffer = \(id: string, fallback\?: Offer \| null\)/);
	assert.match(app, /setFallbackOffer\(fallback \?\? null\)/);
});

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
