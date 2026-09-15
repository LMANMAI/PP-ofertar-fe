/**
 * El orden de "productos que comprás seguido".
 *
 *   npx tsx scripts/verifyRecurringOrder.ts
 *
 * El orden pedido, de arriba abajo:
 *   1. con promoción de campaña   (más recurrente primero)
 *   2. con precio de catálogo     (mismo criterio de recurrencia)
 *   3. con oferta de otra marca
 *   4. sin oferta
 *
 * Las campañas van arriba porque vencen: un precio de góndola sigue ahí la
 * semana que viene, un "70% en la 2da unidad" no.
 */
import assert from "node:assert/strict";

import { sortByOfferRelevance } from "../src/services/productsApi";
import type { RecurringProduct } from "../src/services/productsApi";

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

type Kind = "campaign" | "catalog" | "both" | "alternative" | "none";

function product(name: string, kind: Kind, tickets: number): RecurringProduct {
	const catalog = {
		retailerName: "Carrefour",
		productName: name,
		price: 1000,
		listPrice: 1500,
		discountPct: 30,
		url: null,
	};
	const campaign = {
		offerId: `campaign:${name}`,
		retailerName: "Carrefour",
		province: null,
		legalText: null,
		activeTo: null,
		imageUrl: null,
		discountPercentages: [70],
		mechanic: "second_unit",
		percentagesUnverified: false,
	};
	return {
		description: name,
		barcode: null,
		category: "Almacen",
		purchaseCount: tickets,
		ticketCount: tickets,
		inReferenceTicket: false,
		lastPaidPrice: 1200,
		lastPaidAt: null,
		totalDiscounts: 0,
		bestOffer: kind === "catalog" || kind === "both" ? (catalog as never) : null,
		campaignOffers: kind === "campaign" || kind === "both" ? ([campaign] as never) : [],
		alternativeOffers: kind === "alternative" ? ([catalog] as never) : [],
	} as RecurringProduct;
}

const order = (items: RecurringProduct[]) =>
	sortByOfferRelevance(items).map((p) => p.description);

console.log("sortByOfferRelevance(): cuatro niveles, recurrencia adentro de cada uno");

check("una campaña poco recurrente va arriba de un catálogo muy recurrente", () => {
	// El caso que motivó el cambio: el 70% en la 2da unidad vence, el precio no.
	const items = [product("catalogo-frecuente", "catalog", 9), product("campaña-rara", "campaign", 1)];
	assert.deepEqual(order(items), ["campaña-rara", "catalogo-frecuente"]);
});

check("los cuatro niveles quedan en el orden pedido", () => {
	const items = [
		product("sin-oferta", "none", 9),
		product("otra-marca", "alternative", 9),
		product("catalogo", "catalog", 9),
		product("campaña", "campaign", 9),
	];
	assert.deepEqual(order(items), ["campaña", "catalogo", "otra-marca", "sin-oferta"]);
});

check("dentro de las campañas manda la recurrencia", () => {
	const items = [product("campaña-1", "campaign", 1), product("campaña-8", "campaign", 8)];
	assert.deepEqual(order(items), ["campaña-8", "campaña-1"]);
});

check("dentro del catálogo manda la recurrencia, igual que en campañas", () => {
	const items = [product("catalogo-2", "catalog", 2), product("catalogo-7", "catalog", 7)];
	assert.deepEqual(order(items), ["catalogo-7", "catalogo-2"]);
});

check("un producto con campaña Y catálogo cuenta como campaña", () => {
	// Si contara como catálogo, tener además un precio lo hundiría.
	const items = [product("catalogo", "catalog", 9), product("ambas", "both", 1)];
	assert.deepEqual(order(items), ["ambas", "catalogo"]);
});

check("la recurrencia se mide primero por tickets y despues por unidades", () => {
	// Separados a proposito: comprarlo en mas tickets distintos pesa mas que
	// llevarse muchas unidades de una sola vez. Con los dos numeros iguales
	// este desempate queda tapado por el siguiente.
	const enMasTickets = product("en-4-tickets", "catalog", 4);
	enMasTickets.purchaseCount = 4;
	const muchasDeUnaVez = product("una-compra-grande", "catalog", 2);
	muchasDeUnaVez.purchaseCount = 20;
	assert.deepEqual(order([muchasDeUnaVez, enMasTickets]), ["en-4-tickets", "una-compra-grande"]);
});

check("otra marca sigue por encima de no tener nada", () => {
	const items = [product("sin-oferta", "none", 9), product("otra-marca", "alternative", 1)];
	assert.deepEqual(order(items), ["otra-marca", "sin-oferta"]);
});

check("el orden no depende del orden de entrada", () => {
	const a = [product("campaña", "campaign", 3), product("catalogo", "catalog", 5)];
	const b = [product("catalogo", "catalog", 5), product("campaña", "campaign", 3)];
	assert.deepEqual(order(a), order(b));
});

check("no muta el array que recibe", () => {
	const items = [product("catalogo", "catalog", 1), product("campaña", "campaign", 9)];
	const antes = items.map((p) => p.description);
	sortByOfferRelevance(items);
	assert.deepEqual(items.map((p) => p.description), antes);
});

check("el carrusel sigue siendo prefijo exacto de la lista", () => {
	// Home ordena y corta 10; la sección ordena todo. Tienen que coincidir.
	const items = Array.from({ length: 25 }, (_, i) =>
		product(`p${i}`, (["campaign", "catalog", "alternative", "none"] as Kind[])[i % 4], (i % 5) + 1),
	);
	const carrusel = sortByOfferRelevance(items).slice(0, 10).map((p) => p.description);
	const lista = sortByOfferRelevance(items).map((p) => p.description).slice(0, 10);
	assert.deepEqual(carrusel, lista);
});

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
