/**
 * Qué promoción aplica en "productos que comprás seguido".
 *
 *   npx tsx scripts/verifyPromoLabels.ts
 *
 * La queja que motiva esto: "en los productos con promoción siguen sin
 * aparecer los 3x2, 80% de Dto en la 2da unidad, etc. Sólo aparece 'mejor en X
 * supermercado'". El dato ya llegaba (o llega ahora que el scraper lee bien la
 * etiqueta de VTEX), pero la app lo trataba como un renglón más.
 *
 * Se verifican tres cosas, porque arreglar una sola no alcanza:
 *   1. que las etiquetas reales de cada cadena se clasifiquen bien;
 *   2. que una promo bancaria NUNCA se presente como la promo del producto;
 *   3. que la pantalla efectivamente la muestre arriba, y que el texto de
 *      ahorro acumulado ya no esté.
 *
 * Las etiquetas de los fixtures son textuales, medidas contra el catálogo real
 * de COTO, Dia y Carrefour.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describePromoLabel, readPromoLabel } from "../src/services/promoLabels";
import { summarizeOfferPromos } from "../src/services/productsApi";
import type { BestOffer } from "../src/services/productsApi";

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

/** Una oferta de catálogo mínima: sólo importan las etiquetas y el precio. */
function bestOffer(extra: Partial<BestOffer> = {}): BestOffer {
	return {
		retailerName: "COTO",
		productName: "Gaseosa Cola 2.25L",
		price: 3200,
		listPrice: 4000,
		discountPct: 20,
		promoLabel: null,
		...extra,
	};
}

const read = (label: string) => {
	const reading = readPromoLabel(label);
	return { ...reading, wording: describePromoLabel(reading) };
};

console.log("Clasificación de las etiquetas reales de COTO");

check('"3X2" es un 3x2 y pide llevar 3', () => {
	const r = read("3X2");
	assert.equal(r.kind, "quantity");
	assert.equal(r.condition, "nxm");
	assert.equal(r.requiredQuantity, 3);
	assert.equal(r.mechanic, "3x2");
	// La redacción sale de describePromo, no de una copia paralela.
	assert.equal(r.wording.amount, "3x2");
	assert.equal(r.wording.applies, "Llevás 3, pagás 2");
	assert.equal(r.wording.conditional, true);
});

check('"2X1" es un 2x1 y pide llevar 2', () => {
	const r = read("2X1");
	assert.equal(r.requiredQuantity, 2);
	assert.equal(r.mechanic, "2x1");
	assert.equal(r.wording.amount, "2x1");
});

check('"4X3 / 4X2" muestra el mejor de los dos y lo marca como techo', () => {
	// Dos ofertas en una etiqueta. Mismo criterio que describePromo con varios
	// porcentajes: se muestra el techo y se dice "hasta".
	const r = read("4X3 / 4X2");
	assert.equal(r.requiredQuantity, 4);
	assert.equal(r.paidUnits, 2);
	assert.equal(r.mechanic, null, "4x2 no entra en el vocabulario de campañas");
	assert.equal(r.wording.amount, "4x2");
	assert.equal(r.wording.capped, true);
	assert.equal(r.wording.applies, "Llevás 4, pagás 2");
});

check('"2da Unid 70% DTO!!" es descuento en la 2da unidad, no en la 1ra', () => {
	const r = read("2da Unid 70% DTO!!");
	assert.equal(r.condition, "nth_unit");
	assert.equal(r.requiredQuantity, 2);
	assert.equal(r.percentage, 70);
	assert.equal(r.mechanic, "second_unit");
	assert.equal(r.wording.applies, "En la 2da unidad");
	assert.equal(r.wording.conditional, true);
});

check('"2da Unid Hasta 70% DTO!!" no promete el 70% como piso', () => {
	// El "hasta" viene escrito en la etiqueta, con un solo porcentaje: es el
	// caso para el que describePromo recibió el parámetro `hedged`, porque
	// contar números no alcanza para detectarlo.
	const r = read("2da Unid Hasta 70% DTO!!");
	assert.equal(r.mechanic, "second_unit");
	assert.equal(r.wording.capped, true);
	assert.equal(r.wording.headline, "Hasta 70% en la 2da unidad");
});

check('"3er Unid 50% DTO!!" se redacta igual aunque no sea la 2da', () => {
	// El caso que el vocabulario de campañas no puede expresar: describePromo
	// sólo sabe de la segunda unidad. Sin esto salía como "50% de descuento".
	const r = read("3er Unid 50% DTO!!");
	assert.equal(r.requiredQuantity, 3);
	assert.equal(r.mechanic, null);
	assert.equal(r.wording.applies, "En la 3ª unidad");
	assert.equal(r.wording.conditional, true);
});

check('"Llevando 2 (Hasta 30% DTO!!)" NO se confunde con un 2da unidad', () => {
	// 30% sobre el total llevando dos no es 30% en la segunda: redactarlo como
	// lo segundo le regalaría al usuario la mitad de un descuento que no tiene.
	const r = read("Llevando 2 (Hasta 30% DTO!!)");
	assert.equal(r.condition, "bulk");
	assert.equal(r.requiredQuantity, 2);
	assert.equal(r.percentage, 30);
	assert.equal(r.mechanic, null);
	assert.equal(r.wording.applies, "Llevando 2");
	assert.equal(r.wording.capped, true, 'la etiqueta dice "Hasta"');
	assert.match(r.wording.detail, /con una sola, el precio no baja/);
});

check('"Llevando 6 (Hasta 30% DTO!!)" pide seis, no dos', () => {
	const r = read("Llevando 6 (Hasta 30% DTO!!)");
	assert.equal(r.requiredQuantity, 6);
	assert.equal(r.wording.applies, "Llevando 6");
});

console.log("\nClasificación de las etiquetas reales de Dia");

check('"2do al 70%" es la 2da unidad aunque no diga "unidad"', () => {
	const r = read("2do al 70%");
	assert.equal(r.requiredQuantity, 2);
	assert.equal(r.percentage, 70);
	assert.equal(r.mechanic, "second_unit");
	assert.equal(r.wording.applies, "En la 2da unidad");
});

check('"2do al 50%" lee el porcentaje que corresponde', () => {
	assert.equal(read("2do al 50%").percentage, 50);
});

check('"2x1" en minúscula es el mismo 2x1', () => {
	assert.equal(read("2x1").mechanic, "2x1");
});

check('"35%" es el único caso que sí baja la unidad', () => {
	const r = read("35%");
	assert.equal(r.kind, "percentage");
	assert.equal(r.requiredQuantity, 1);
	assert.equal(r.mechanic, "percentage_off");
	assert.equal(r.wording.conditional, false, "un % directo no es condicional");
	assert.equal(r.wording.applies, "Descuento sobre el precio");
});

console.log("\nLas promos bancarias de Carrefour no son promos del producto");

const bancarias = [
	"Tarjeta Carrefour 15%",
	"Tarjeta Carrefour 20% Off Martes",
	"PROMO-Mi CRF -mfl-1-7-Dto de 7% Doble Precio",
];

for (const label of bancarias) {
	check(`"${label}" se clasifica como medio de pago`, () => {
		const r = read(label);
		assert.equal(r.kind, "payment", "mostrarlo como mecánica del producto sería engañoso");
		assert.equal(r.requiredQuantity, 1);
		assert.equal(r.mechanic, null);
	});
}

check('"Débito 25%" se detecta con acento y todo', () => {
	// Ejercita la normalización: sin sacar el acento, "DÉBITO" no matchea.
	assert.equal(read("Débito 25%").kind, "payment");
});

console.log("\nBancos, billeteras y programas de fidelidad argentinos");

// Las diez que faltaban. Las tres del final se clasificaban como `percentage` y
// salían redactadas "30% · Descuento sobre el precio", o sea: el producto está
// 30% más barato en la góndola. No lo está, hay que pagar con una tarjeta
// puntual. Es la misma mentira que la de las de "Tarjeta", más chica.
const mediosDePago = [
	"Banco Nación 30%",
	"3 cuotas sin interés",
	"Visa 20%",
	"Mastercard 25% Off",
	"MODO 15%",
	"6 cuotas fijas",
	"Ahora 12",
	"Mi Carrefour 10%",
	"Cuenta DNI 20%",
	"Galicia 30% Jueves",
];

for (const label of mediosDePago) {
	check(`"${label}" es medio de pago, no descuento de góndola`, () => {
		const r = read(label);
		assert.equal(r.kind, "payment");
		assert.notEqual(r.mechanic, "percentage_off", "se redactaría como rebaja de góndola");
	});
}

check("ninguna promo bancaria se convierte en mecánica de cantidad", () => {
	// El modo de falla grave: inventar un 3x2 a partir de un "Ahora 12".
	//
	// Desde que la mecánica se chequea ANTES que el medio de pago, este check
	// dejó de ser una consecuencia del orden y pasó a ser la evidencia que lo
	// justifica: ninguna de las 13 etiquetas bancarias reales que hay de
	// fixture trae un patrón de cantidad, así que adelantar la mecánica no
	// movió ni una sola de bucket. Si algún día aparece una que sí lo traiga,
	// esto falla y hay que volver a discutir el orden.
	for (const label of [...mediosDePago, ...bancarias]) {
		const r = read(label);
		assert.notEqual(r.kind, "quantity", `${label} se leyó como mecánica de producto`);
		assert.equal(r.requiredQuantity, 1, `${label} pidió llevar más de una unidad`);
	}
});

check('"Miembros Comunidad" no queda nunca como descuento sobre el precio', () => {
	// COTO lo manda como corte propio. Se decidió tratarlo como medio de pago:
	// es un beneficio de socios, no un precio de góndola. Lo que no puede pasar
	// —y esto es lo que el check protege— es que se lea como una rebaja.
	const r = read("Miembros Comunidad");
	assert.equal(r.kind, "payment");
	assert.notEqual(r.mechanic, "percentage_off");
	assert.equal(read("Comunidad 20%").kind, "payment");
});

check("los nombres de banco no se comen palabras que los contienen", () => {
	// "NACION" sin bordes de palabra matchea "NACIONAL", que en una góndola
	// argentina es una palabra normal. Por eso van con \b de los dos lados.
	assert.notEqual(read("Producto Nacional 20%").kind, "payment");
});

check('la billetera "MODO" no se come "cómodo"', () => {
	// Sin \b, y después de sacarle el acento, "CÓMODO" contiene "MODO": la
	// etiqueta entera se clasificaría como medio de pago y el 3x2 real
	// desaparecería atrás de una promo bancaria que no existe. Es el modo de
	// falla grave, al revés.
	const r = read("Pack Cómodo 3X2");
	assert.equal(r.kind, "quantity");
	assert.equal(r.mechanic, "3x2");
});

console.log("\nUn nombre de producto no puede tapar una mecánica real");

// El modo de falla inverso: la etiqueta trae un 3x2 de verdad y una palabra que
// también es un banco, una fruta o una marca. Con el medio de pago corriendo
// primero, los dos últimos perdían la mecánica entera — y "Ciudad del Lago" es
// una marca real del feed de COTO ("Medallón de carne vacuna CIUDAD DEL LAGO").
const mecanicasConNombrePropio: [string, string | null, number][] = [
	["Cerveza Patagonia 2x1", "2x1", 2],
	["Pack Cómodo 3X2", "3x2", 3],
	["Yerba Nacional 3X2", "3x2", 3],
	["Queso Macro 2x1", "2x1", 2],
	["Agua Villa del Sur 3X2", "3x2", 3],
	["Alfajor Ciudad del Lago 2da Unid 70%", "second_unit", 2],
	["Pan Dulce Naranja Confitada 2x1", "2x1", 2],
];

for (const [label, mechanic, qty] of mecanicasConNombrePropio) {
	check(`"${label}" conserva la mecánica`, () => {
		const r = read(label);
		assert.equal(r.kind, "quantity", "la mecánica se perdió atrás de un nombre propio");
		assert.equal(r.mechanic, mechanic);
		assert.equal(r.requiredQuantity, qty);
	});
}

check("la estructura le gana al nombre propio, no al revés", () => {
	// La regla que sostiene los siete de arriba: un patrón de cantidad es
	// evidencia más fuerte que un nombre de tres letras, porque ninguna promo
	// bancaria usa "3X2". Si el orden se da vuelta, esto se cae.
	assert.equal(read("Naranja 2x1").kind, "quantity");
	assert.equal(read("Naranja 20%").kind, "payment", "sin mecánica, el nombre sigue mandando");
});

check("una mecánica que además pide tarjeta no pierde ninguna de las dos cosas", () => {
	// Caso mixto. Gana la mecánica —es lo que el usuario preguntó— pero la
	// condición de pago se sigue sabiendo y se dice en el detalle.
	const r = read("2da Unid 70% con Tarjeta Carrefour");
	assert.equal(r.kind, "quantity");
	assert.equal(r.mechanic, "second_unit");
	assert.equal(r.paymentHint, true);
	assert.match(r.wording.detail, /medio de pago o programa/);
	assert.equal(r.wording.conditional, true);
});

check('"Patagonia" y "Macro" sueltos no son bancos', () => {
	// Patagonia es una cerveza antes que un banco, y Macro está a una letra de
	// Makro, que es una de las cadenas del feed. Sólo se alcanzan vía "BANCO".
	// Si esto se rompe, un 2x1 real desaparece atrás de una promo bancaria.
	const cerveza = read("Cerveza Patagonia 2x1");
	assert.equal(cerveza.kind, "quantity");
	assert.equal(cerveza.mechanic, "2x1");
	// Pero el banco, escrito como se escribe, sí se detecta.
	assert.equal(read("Banco Patagonia 25%").kind, "payment");
	assert.equal(read("Banco Macro 30%").kind, "payment");
});

console.log("\nEl piso: un porcentaje con nombre propio no es una rebaja");

check("un banco que no está en la lista igual no miente", () => {
	// La respuesta a "la lista de nombres envejece". Un nombre que nadie agregó
	// todavía no se redacta como rebaja de góndola: se dice que hay una
	// condición que no supimos leer.
	const r = read("Banquito del Futuro 30%");
	assert.notEqual(r.kind, "percentage");
	assert.notEqual(r.mechanic, "percentage_off");
	assert.equal(r.wording.applies, "Consultá cómo se aplica");
	assert.equal(r.wording.conditional, true);
	assert.equal(r.wording.amount, "30%");
});

check("el piso no se come los porcentajes limpios de verdad", () => {
	// Si la regla fuera más ancha se llevaría puesto el único caso que SÍ baja
	// la unidad. Estas cuatro son textuales del catálogo real.
	for (const label of ["35%", "25%", "50%Dto", "Hasta 50% DTO!!"]) {
		const r = read(label);
		assert.equal(r.kind, "percentage", `${label} dejó de ser un descuento directo`);
		assert.equal(r.wording.applies, "Descuento sobre el precio");
	}
	// Y el "hasta" sigue distinguiéndose del porcentaje firme.
	assert.equal(read("Hasta 50% DTO!!").capped, true);
	assert.equal(read("50%Dto").capped, false);
});

console.log("\nLo que termina mostrando la tarjeta del producto");

check("la mecánica del producto le gana a las bancarias de la misma oferta", () => {
	const summary = summarizeOfferPromos(
		bestOffer({ promoLabel: "3X2", promoLabels: ["3X2", ...bancarias] }),
	);
	assert.equal(summary.featured?.wording.amount, "3x2");
	assert.equal(summary.featured?.requiredQuantity, 3);
	assert.deepEqual(summary.payment, bancarias);
	assert.deepEqual(summary.other, []);
});

check("con SOLO bancarias no se destaca ninguna promoción de producto", () => {
	// El check que sostiene toda la decisión: en Carrefour esto es el 100% del
	// catálogo, y poner "15%" en el tile grande diría que la unidad sale 15%
	// menos para cualquiera.
	const summary = summarizeOfferPromos(bestOffer({ promoLabels: bancarias }));
	assert.equal(summary.featured, null);
	assert.equal(summary.payment.length, 3);
});

check("entre dos mecánicas gana la que pide llevar menos unidades", () => {
	const summary = summarizeOfferPromos(
		bestOffer({ promoLabels: ["Llevando 6 (Hasta 30% DTO!!)", "2da Unid 70% DTO!!"] }),
	);
	assert.equal(summary.featured?.requiredQuantity, 2);
	assert.deepEqual(summary.other, ["Llevando 6 (Hasta 30% DTO!!)"]);
});

check("degrada con gracia cuando el backend manda una sola etiqueta", () => {
	// Es el backend de hoy: `promoLabel` y nada más. La cantidad se infiere del
	// texto porque `requiredQuantity` todavía no viene.
	const summary = summarizeOfferPromos(bestOffer({ promoLabel: "2da Unid 70% DTO!!" }));
	assert.equal(summary.featured?.requiredQuantity, 2);
	assert.equal(summary.featured?.wording.applies, "En la 2da unidad");
	assert.equal(summary.featured?.unitPrice, null, "sin precio unitario no se inventa uno");
});

check("sin ninguna etiqueta no se rompe ni se inventa nada", () => {
	const summary = summarizeOfferPromos(bestOffer());
	assert.equal(summary.featured, null);
	assert.deepEqual(summary.payment, []);
	assert.deepEqual(summary.other, []);
});

check("una etiqueta ilegible se muestra cruda en vez de perderse", () => {
	const summary = summarizeOfferPromos(bestOffer({ promoLabels: ["Promo especial de temporada"] }));
	assert.equal(summary.featured, null, 'no da para el tile grande decir "hay algo"');
	assert.deepEqual(summary.other, ["Promo especial de temporada"]);
});

check("el precio unitario de la promo se muestra cuando la condición coincide", () => {
	const summary = summarizeOfferPromos(
		bestOffer({ promoLabels: ["3X2"], requiredQuantity: 3, promoUnitPrice: 2133 }),
	);
	assert.equal(summary.featured?.unitPrice, 2133);
});

check("un precio unitario de OTRA condición no se pega a esta", () => {
	// El backend manda `promoUnitPrice` junto con SU `requiredQuantity`. Si la
	// etiqueta que destacamos pide otra cantidad, el número no es de esta promo.
	const summary = summarizeOfferPromos(
		bestOffer({ promoLabels: ["3X2"], requiredQuantity: 2, promoUnitPrice: 2133 }),
	);
	assert.equal(summary.featured?.unitPrice, null);
});

console.log("\nLa pantalla de productos recurrentes");

const screen = src("src", "screens", "RecurringProductsScreen.tsx");

check("la tarjeta clasifica las promos en vez de imprimir la etiqueta cruda", () => {
	assert.ok(
		screen.includes("summarizeOfferPromos(offer)"),
		"sin esto vuelve el renglón único con offer.promoLabel",
	);
});

check("la mecánica usa el mismo tile + chip que las cards de oferta", () => {
	assert.ok(screen.includes("styles.amountTile"), "falta el tile del monto");
	assert.ok(screen.includes("styles.appliesChip"), 'falta el chip de "aplica a"');
	assert.ok(
		screen.includes("featured.wording.conditional && styles.appliesChipWarm"),
		"el chip tiene que ponerse cálido cuando la promo es condicional",
	);
});

check("la mecánica se muestra siempre, no sólo con la tarjeta desplegada", () => {
	// El renglón viejo vivía adentro del detalle desplegado. Si el bloque nuevo
	// cae ahí también, el usuario sigue sin ver qué promoción aplica de entrada.
	const featuredAt = screen.indexOf("{featured && (");
	const expandedAt = screen.indexOf("{isExpanded && hasAnything && (");
	assert.ok(featuredAt > 0, "no está el bloque de la mecánica destacada");
	assert.ok(expandedAt > 0, "no está el bloque del detalle desplegado");
	assert.ok(featuredAt < expandedAt, "la mecánica quedó adentro del detalle desplegado");
});

check("con condición de cantidad se aclara que una sola unidad no baja", () => {
	// Es el punto de toda la tarea.
	assert.ok(screen.includes("featured.requiredQuantity > 1"), "falta el guard de la condición");
	assert.ok(
		screen.includes("Llevando 1 sola unidad pagás"),
		"falta decir cuánto sale llevando una sola",
	);
});

check("las bancarias van aparte y dichas como condicionadas", () => {
	assert.ok(screen.includes("promos.payment.length > 0"), "no se muestran las bancarias");
	// El rótulo dice "tarjeta o programa" y no "medio de pago" porque en este
	// balde también cae "Miembros Comunidad", que es un beneficio de socios y
	// no se paga con nada. Lo que comparten es que exigen cumplir algo que no
	// es llevar más unidades, y eso es lo que el renglón tiene que decir.
	assert.ok(
		screen.includes("Con tarjeta o programa de"),
		"las bancarias tienen que estar etiquetadas como condicionadas a tarjeta o programa",
	);
	assert.ok(
		!screen.includes("Pagando con medio de pago"),
		'quedó el rótulo viejo, que leía mal para un beneficio de socios',
	);
});

console.log("\nEl texto de ahorro acumulado ya no está");

check('no queda el "ya llevás $X ahorrados"', () => {
	assert.ok(
		!/ahorrados en este producto/.test(screen),
		"el texto de ahorro acumulado sigue en la pantalla",
	);
	assert.ok(!/p\.totalDiscounts/.test(screen), "la pantalla sigue leyendo totalDiscounts");
});

check("no quedaron estilos huérfanos de ese bloque", () => {
	for (const style of ["historyRow", "historyText"]) {
		assert.ok(!screen.includes(style), `quedó el estilo huérfano ${style}`);
	}
});

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
