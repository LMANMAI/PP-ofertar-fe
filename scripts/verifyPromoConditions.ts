/**
 * Qué va en la tarjeta de descuento y qué va en la hoja de condiciones.
 *
 *   npx tsx scripts/verifyPromoConditions.ts
 *
 * El pedido de producto: tarjetas con menos texto explicativo, el precio final
 * grande en vez de un "-25%" que obliga a hacer la cuenta, el logo del súper
 * a la vista, y la letra chica (topes, legales, avisos) en una hoja aparte.
 *
 * Lo que se verifica son las reglas que ese rediseño NO puede romper, porque
 * vienen de bugs reales:
 *   1. la condición de una promo (3x2, 2da unidad, llevando N) se queda en la
 *      tarjeta, pegada al número, y el precio de UNA unidad sigue visible;
 *   2. no se muestra un precio por unidad que la cadena no publicó;
 *   3. los topes de reintegro y compras mínimas no se extraen del legal;
 *   4. el botón "Condiciones" no aparece cuando la hoja no tendría nada nuevo;
 *   5. el texto de las promos de pago ("Con tarjeta o programa de …") sigue
 *      igual y en su lugar.
 *
 * La lógica vive en `src/components/promoConditions.ts`, un módulo plano, así
 * que se ejercita de verdad. El cableado de las pantallas (JSX de React
 * Native, que no se monta desde Node) se chequea sobre el fuente, como en los
 * otros scripts.
 *
 * Las etiquetas de los fixtures son textuales del catálogo real (las mismas de
 * scripts/verifyPromoLabels.ts).
 */
import {
	CONDITIONS_BUTTON_TEXT,
	heroSpoken,
	offerCardHero,
	offerConditions,
	productConditions,
	productOfferHero,
	validityText,
	type OfferHero,
	type PromoConditions,
} from "../src/components/promoConditions";
import { retailerSlugFromName } from "../src/services/productsApi";
import type { BestOffer, CampaignOffer, RecurringProduct } from "../src/services/productsApi";
import type { Offer } from "../src/services/offersApi";
import { formatCurrency } from "../src/utils/format";

// Sin `import … from "node:…"`: el tsconfig del repo no carga los tipos de Node
// y cada import así suma un error a `tsc --noEmit` (los que ya hay en scripts/
// son justamente esos). `require` sí está tipado —lo declara Expo para Metro—,
// así que con interfaces mínimas escritas acá el script no agrega ninguno.
type Assert = {
	ok(value: unknown, message?: string): asserts value;
	equal(actual: unknown, expected: unknown, message?: string): void;
	notEqual(actual: unknown, expected: unknown, message?: string): void;
	deepEqual(actual: unknown, expected: unknown, message?: string): void;
	match(value: string, re: RegExp, message?: string): void;
};
type Fs = { readFileSync(path: string, encoding: "utf8"): string };
type Path = { dirname(path: string): string; resolve(...parts: string[]): string };
type Url = { fileURLToPath(url: string): string };
const assert: Assert = require("node:assert/strict");
const { readFileSync }: Fs = require("node:fs");
const { dirname, resolve }: Path = require("node:path");
const { fileURLToPath }: Url = require("node:url");

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

/** Una oferta de catálogo mínima, como la de verifyPromoLabels: COTO, $3.200
 * con lista de $4.000. */
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

function campaign(extra: Partial<CampaignOffer> = {}): CampaignOffer {
	return {
		offerId: "campaign:ext-123",
		retailerName: "Carrefour",
		province: "Buenos Aires",
		legalText:
			"Promoción válida del 1/9 al 30/9 en hipermercados Carrefour. Tope de reintegro $2.000 por cuenta. Compra mínima $15.000. No acumulable con otras promociones.",
		activeTo: "2099-12-31",
		imageUrl: null,
		discountPercentages: [70],
		mechanic: "second_unit",
		percentagesUnverified: false,
		...extra,
	};
}

function product(extra: Partial<RecurringProduct> = {}): RecurringProduct {
	return {
		description: "Gaseosa cola 2.25 l",
		barcode: "7790895000997",
		category: null,
		purchaseCount: 4,
		ticketCount: 3,
		inReferenceTicket: true,
		totalDiscounts: 0,
		lastPaidPrice: null,
		lastPaidAt: null,
		bestOffer: null,
		campaignOffers: [],
		alternativeOffers: [],
		...extra,
	};
}

function feedOffer(extra: Partial<Offer> = {}): Offer {
	return {
		id: "catalog:1",
		kind: "catalog",
		retailerSlug: "carrefour",
		retailerName: "Carrefour",
		headline: "-25%",
		productName: "Aceite de girasol 1.5 L",
		brand: null,
		category: "Almacén",
		price: 3000,
		listPrice: 4000,
		discountPct: 25,
		imageUrl: null,
		url: null,
		province: null,
		activeTo: "2099-12-31",
		legalText: null,
		percentagesUnverified: false,
		...extra,
	};
}

/** Todo el texto de una hoja, para buscar qué terminó adentro. */
function sheetText(c: PromoConditions | null): string {
	if (!c) return "";
	return [c.title, c.subtitle ?? "", ...c.blocks.flatMap((b) => [b.title, ...b.lines.map((l) => l.text)])].join("\n");
}

/** La condición que la tarjeta muestra pegada al número, o null. */
function cardCondition(hero: OfferHero): string | null {
	if (hero.kind === "unitPrice") return hero.condition;
	if (hero.kind === "mechanic") return hero.applies;
	return null;
}

console.log("Lo grande de la tarjeta de un producto");

check("una rebaja lisa muestra el precio final y el de lista tachado, sin porcentaje", () => {
	const hero = productOfferHero(bestOffer(), false);
	assert.deepEqual(hero, { kind: "price", price: 3200, listPrice: 4000, discountPct: null });
});

check("sin precio de lista que tachar, el porcentaje queda como única pista", () => {
	const hero = productOfferHero(bestOffer({ listPrice: null, discountPct: 19.6 }), false);
	assert.deepEqual(hero, { kind: "price", price: 3200, listPrice: null, discountPct: 20 });
});

check("un 3x2 sin precio por unidad publicado: la mecánica es la protagonista", () => {
	const hero = productOfferHero(bestOffer({ promoLabels: ["3X2"] }), false);
	assert.equal(hero.kind, "mechanic");
	if (hero.kind !== "mechanic") return;
	assert.equal(hero.amount, "3x2");
	assert.equal(hero.applies, "Llevás 3, pagás 2");
	assert.equal(hero.conditional, true);
});

check("un 3x2 sin dato NO inventa el precio por unidad", () => {
	// $3.200 × 2 / 3 = $2.133. Es la cuenta tentadora, y no es nuestra de
	// hacer: no sabemos si el 3x2 va sobre ese precio o sobre el de lista.
	const hero = productOfferHero(bestOffer({ promoLabels: ["3X2"] }), false);
	assert.notEqual(hero.kind, "unitPrice");
	assert.ok(!heroSpoken(hero).includes("2.133"), `apareció un precio calculado: ${heroSpoken(hero)}`);
});

check('un "2da Unid 70%" sin dato tampoco promedia las dos unidades', () => {
	// ($3.200 + $960) / 2 = $2.080 por unidad. Mismo motivo.
	const hero = productOfferHero(bestOffer({ promoLabels: ["2da Unid 70% DTO!!"] }), false);
	assert.equal(hero.kind, "mechanic");
	if (hero.kind !== "mechanic") return;
	assert.equal(hero.amount, "70%");
	assert.equal(hero.applies, "En la 2da unidad");
	assert.ok(!heroSpoken(hero).includes("2.080"), `apareció un precio calculado: ${heroSpoken(hero)}`);
});

check("con precio por unidad publicado para ESA condición, ése es el número grande", () => {
	const hero = productOfferHero(
		bestOffer({ promoLabels: ["3X2"], requiredQuantity: 3, promoUnitPrice: 2133 }),
		false,
	);
	assert.deepEqual(hero, {
		kind: "unitPrice",
		unitPrice: 2133,
		condition: "llevando 3",
		single: { price: 3200, text: "Llevando 1 sola unidad pagás $3.200" },
	});
});

check("un precio por unidad de OTRA condición no se usa", () => {
	const hero = productOfferHero(
		bestOffer({ promoLabels: ["3X2"], requiredQuantity: 2, promoUnitPrice: 2133 }),
		false,
	);
	assert.equal(hero.kind, "mechanic");
});

check("un precio por unidad que no es menor al de una unidad es un dato roto y no se muestra", () => {
	const hero = productOfferHero(
		bestOffer({ promoLabels: ["3X2"], requiredQuantity: 3, promoUnitPrice: 3200 }),
		false,
	);
	assert.equal(hero.kind, "mechanic");
});

check("un precio de otro producto no lleva ni tachado ni mecánica", () => {
	const hero = productOfferHero(bestOffer({ promoLabels: ["3X2"] }), true);
	assert.deepEqual(hero, { kind: "price", price: 3200, listPrice: null, discountPct: null });
});

check("Carrefour con sólo bancarias: precio, y las bancarias no se cuelan en lo grande", () => {
	const hero = productOfferHero(
		bestOffer({
			retailerName: "Carrefour",
			promoLabels: ["Tarjeta Carrefour 15%", "Tarjeta Carrefour 20% Off Martes"],
		}),
		false,
	);
	assert.equal(hero.kind, "price");
	assert.ok(!heroSpoken(hero).includes("Tarjeta"));
});

check('"Llevando 6 (Hasta 30%)" conserva el "hasta" y la condición', () => {
	const hero = productOfferHero(bestOffer({ promoLabels: ["Llevando 6 (Hasta 30% DTO!!)"] }), false);
	assert.equal(hero.kind, "mechanic");
	if (hero.kind !== "mechanic") return;
	assert.equal(hero.capped, true);
	assert.equal(hero.applies, "Llevando 6");
	assert.match(heroSpoken(hero), /^Hasta 30%, Llevando 6, /);
});

console.log("\nLa condición se queda en la tarjeta");

const conditionalFixtures: [string, BestOffer][] = [
	["3X2", bestOffer({ promoLabels: ["3X2"] })],
	["2da Unid 70% DTO!!", bestOffer({ promoLabels: ["2da Unid 70% DTO!!"] })],
	["Llevando 6", bestOffer({ promoLabels: ["Llevando 6 (Hasta 30% DTO!!)"] })],
	["2do al 50% (Carrefour)", bestOffer({ promoLabels: ["PROMO-2do al 50% Max 8 unidades Iguales-Reg-2-50-AS9.9 AL 15.9"] })],
	["3X2 con precio por unidad", bestOffer({ promoLabels: ["3X2"], requiredQuantity: 3, promoUnitPrice: 2133 })],
];

for (const [name, offer] of conditionalFixtures) {
	check(`${name}: la condición y el precio de una unidad están en la tarjeta`, () => {
		const hero = productOfferHero(offer, false);
		const condition = cardCondition(hero);
		assert.ok(condition, `la tarjeta no tiene condición (${hero.kind})`);
		assert.ok(hero.kind !== "price", "una promo condicional se mostró como precio liso");
		const single = hero.kind === "unitPrice" ? hero.single : hero.single;
		assert.equal(single?.text, `Llevando 1 sola unidad pagás ${formatCurrency(offer.price)}`);
		// Y lo que lee el lector de pantalla dice lo mismo que se ve.
		assert.ok(heroSpoken(hero).includes(condition), "la condición no llega al lector de pantalla");
	});
}

check("la hoja nunca es el único lugar de la condición, aunque se abra", () => {
	// Con una campaña hay hoja; la explicación larga del 3x2 viaja a la hoja
	// como contexto, pero la condición corta tiene que seguir en la tarjeta.
	const p = product({ bestOffer: bestOffer({ promoLabels: ["3X2"] }), campaignOffers: [campaign()] });
	const sheet = productConditions(p, false);
	assert.ok(sheet, "con una campaña tiene que haber hoja");
	const hero = productOfferHero(p.bestOffer!, false);
	assert.equal(cardCondition(hero), "Llevás 3, pagás 2");
});

check("la explicación de la mecánica sola no justifica la hoja", () => {
	// Si no, el botón aparecería en cada 3x2 para repetir lo que dice la
	// tarjeta, y el usuario aprendería a no tocarlo.
	const p = product({ bestOffer: bestOffer({ promoLabels: ["3X2"] }) });
	assert.equal(productConditions(p, false), null);
});

console.log("\nLa hoja de un producto recurrente");

check('el tope "Max 8 unidades" va a la hoja y no a la tarjeta', () => {
	const offer = bestOffer({
		retailerName: "Carrefour",
		promoLabels: ["PROMO-25% Off Max 8 unidades -Reg-1-25-AS9.9 AL 15.9"],
	});
	const sheet = productConditions(product({ bestOffer: offer }), false);
	assert.ok(sheet, "con tope tiene que haber hoja");
	const cap = sheet.blocks.find((b) => b.kind === "unitCap");
	assert.ok(cap, "falta el bloque del tope");
	assert.equal(cap.lines[0].text, "Máx. 8 unidades por compra con esta promoción.");
	const hero = productOfferHero(offer, false);
	assert.ok(!/\b8\b/.test(heroSpoken(hero)), `el tope se coló en la tarjeta: ${heroSpoken(hero)}`);
});

check("una campaña trae vigencia, su legal entero y el acceso al detalle", () => {
	const c = campaign();
	const sheet = productConditions(product({ campaignOffers: [c] }), false);
	assert.ok(sheet);
	const block = sheet.blocks.find((b) => b.kind === "campaign");
	assert.ok(block, "falta el bloque de la campaña");
	assert.equal(block.title, "70% en la 2da unidad en Carrefour · Buenos Aires");
	assert.equal(block.lines[0].text, "Vigente hasta el 31 de diciembre");
	assert.equal(block.lines[1].text, c.legalText, "el legal tiene que ir tal cual");
	assert.equal(block.lines[1].tone, "legal");
	assert.equal(block.full?.id, "campaign:ext-123");
});

check("una campaña sin id de feed no ofrece un acceso que no abre nada", () => {
	const sheet = productConditions(product({ campaignOffers: [campaign({ offerId: null })] }), false);
	assert.equal(sheet?.blocks.find((b) => b.kind === "campaign")?.full, null);
});

check("el aviso de porcentaje leído por OCR va a la hoja", () => {
	const sheet = productConditions(
		product({ campaignOffers: [campaign({ percentagesUnverified: true })] }),
		false,
	);
	assert.ok(sheet?.blocks.some((b) => b.kind === "notice" && b.lines[0].tone === "warning"));
});

check("sin nada de letra chica no hay hoja (y entonces no hay botón)", () => {
	assert.equal(productConditions(product({ bestOffer: bestOffer() }), false), null);
	assert.equal(productConditions(product(), false), null);
});

check("los topes de reintegro y la compra mínima NO se extraen del legal", () => {
	const c = campaign();
	const sheet = productConditions(product({ campaignOffers: [c] }), false);
	const withAmount = sheet!.blocks.flatMap((b) =>
		[b.title, ...b.lines.filter((l) => l.tone !== "legal").map((l) => l.text)].filter((t) => /\$\s?\d/.test(t)),
	);
	assert.deepEqual(withAmount, [], "un monto del legal terminó fuera del legal");
	// Y en la tarjeta tampoco: el hero de un producto sin precio de catálogo
	// no existe, así que el que se mira es el del feed para la misma campaña.
	const hero = offerCardHero(feedOffer({ kind: "campaign", price: null, listPrice: null, legalText: c.legalText, mechanic: "second_unit", discountPercentages: [70] }));
	assert.ok(!/2\.000|15\.000/.test(heroSpoken(hero)), `un monto del legal llegó a la tarjeta: ${heroSpoken(hero)}`);
});

check("las etiquetas de tarjeta o programa no se mudan a la hoja", () => {
	// Son otra promoción, no la letra chica de ésta, y tienen su texto
	// aprobado en el detalle de la tarjeta.
	const offer = bestOffer({
		retailerName: "Carrefour",
		promoLabels: ["Tarjeta Carrefour 20% Off Martes", "PROMO-25% Off Max 8 unidades -Reg-1-25-AS9.9 AL 15.9"],
	});
	const sheet = productConditions(product({ bestOffer: offer }), false);
	assert.ok(sheet);
	assert.ok(!sheetText(sheet).includes("Tarjeta Carrefour"), "una bancaria terminó en la hoja");
});

console.log("\nLa hoja de una oferta del feed");

check("una oferta de catálogo sin legal ni avisos no tiene hoja", () => {
	assert.equal(offerConditions(feedOffer()), null);
});

check("con legal: legal tal cual, vigencia de contexto y acceso a la oferta completa", () => {
	const offer = feedOffer({ legalText: "Válido del 1/9 al 30/9.\nHasta agotar stock de 500 unidades." });
	const sheet = offerConditions(offer);
	assert.ok(sheet);
	assert.deepEqual(
		sheet.blocks.map((b) => b.kind),
		["validity", "legal"],
	);
	assert.deepEqual(
		sheet.blocks[1].lines.map((l) => l.text),
		["Válido del 1/9 al 30/9.", "Hasta agotar stock de 500 unidades."],
	);
	assert.equal(sheet.full, offer);
	assert.equal(sheet.subtitle, "Carrefour · Aceite de girasol 1.5 L");
});

check("una campaña condicional sin legal ni avisos no tiene hoja", () => {
	// La condición ya está en el chip de la tarjeta; la hoja sólo repetiría.
	const offer = feedOffer({ kind: "campaign", price: null, listPrice: null, mechanic: "3x2", discountPercentages: [] });
	assert.equal(offerConditions(offer), null);
});

check("el aviso de OCR y el de varios porcentajes van a la hoja", () => {
	const offer = feedOffer({
		kind: "campaign",
		price: null,
		listPrice: null,
		mechanic: "percentage_off",
		discountPercentages: [25, 35],
		percentagesUnverified: true,
	});
	const sheet = offerConditions(offer);
	assert.ok(sheet);
	const notices = sheet.blocks.filter((b) => b.kind === "notice").map((b) => b.lines[0].text);
	assert.equal(notices.length, 2);
	assert.match(notices[0], /\(25%, 35%\)/);
	assert.match(notices[1], /se leyó de la imagen/);
});

check("la vigencia dice cuándo vence y la urgencia de la última semana", () => {
	const now = new Date(2026, 8, 27, 15, 0);
	assert.equal(validityText(null, now), "Vigencia no informada");
	assert.equal(validityText("2026-09-27", now), "Vigente hasta el 27 de septiembre · vence hoy");
	assert.equal(validityText("2026-09-28", now), "Vigente hasta el 28 de septiembre · quedan 1 día");
	assert.equal(validityText("2026-09-30", now), "Vigente hasta el 30 de septiembre · quedan 3 días");
	assert.equal(validityText("2026-12-31", now), "Vigente hasta el 31 de diciembre");
});

console.log("\nLo grande de una oferta del feed");

check("catálogo con lista: precio final y tachado, sin porcentaje", () => {
	assert.deepEqual(offerCardHero(feedOffer()), { kind: "price", price: 3000, listPrice: 4000, discountPct: null });
});

check("catálogo sin lista: el porcentaje queda como única pista", () => {
	assert.deepEqual(offerCardHero(feedOffer({ listPrice: null })), {
		kind: "price",
		price: 3000,
		listPrice: null,
		discountPct: 25,
	});
});

check("una campaña de 2da unidad lleva la condición en la tarjeta", () => {
	const hero = offerCardHero(
		feedOffer({ kind: "campaign", price: null, listPrice: null, mechanic: "second_unit", discountPercentages: [70] }),
	);
	assert.equal(hero.kind, "mechanic");
	if (hero.kind !== "mechanic") return;
	assert.equal(hero.amount, "70%");
	assert.equal(hero.applies, "En la 2da unidad");
	assert.equal(hero.conditional, true);
});

check("con un backend sin mecánica, la tarjeta cae al titular que ya venía redactado", () => {
	const hero = offerCardHero(feedOffer({ kind: "campaign", headline: "50% en la 2da unidad", price: null }));
	assert.equal(hero.kind === "mechanic" ? hero.applies : null, "50% en la 2da unidad");
});

check("montos largos se formatean como se escriben en Argentina", () => {
	assert.equal(formatCurrency(1234567), "$1.234.567");
});

console.log("\nEl logo del súper en las tarjetas de productos");

// Las claves de CHAIN_LOGOS, leídas del fuente: el módulo tiene `require()` de
// PNG y no se puede importar desde Node (ver verifyStoreBadge).
const logoKeys = [...src("src", "theme", "chainLogos.ts").matchAll(/^\t(\w+): require\(/gm)].map((m) => m[1]);

check("los nombres de cadena que manda el backend caen en la clave de su logo", () => {
	assert.ok(logoKeys.length >= 8, `leí ${logoKeys.length} logos`);
	const names: [string, string][] = [
		["Carrefour", "carrefour"],
		["COTO", "coto"],
		["Dia", "dia"],
		["Día", "dia"],
		["Jumbo", "jumbo"],
		["Disco", "disco"],
		["Vea", "vea"],
		["Changomas", "changomas"],
		["ChangoMâs", "changomas"],
		["Makro", "makro"],
		["Carrefour Argentina", "carrefour"],
	];
	for (const [name, slug] of names) {
		assert.equal(retailerSlugFromName(name), slug, name);
		assert.ok(logoKeys.includes(slug), `no hay logo para ${slug}`);
	}
	// La Anónima no tiene logo, pero tiene que caer en su pin.
	assert.equal(retailerSlugFromName("La Anónima"), "laanonima");
	assert.ok(src("src", "theme", "chainMarkers.ts").includes("laanonima:"));
});

check("sin nombre no hay slug inventado", () => {
	assert.equal(retailerSlugFromName(null), null);
	assert.equal(retailerSlugFromName("  "), null);
});

console.log("\nEl cableado de las pantallas");

const recurring = src("src", "screens", "RecurringProductsScreen.tsx");
const offers = src("src", "screens", "OffersScreen.tsx");
const home = src("src", "screens", "HomeScreen.tsx");
const sheet = src("src", "components", "PromoConditionsSheet.tsx");
const offerLine = src("src", "components", "ProductOfferLine.tsx");

const screens: [string, string][] = [
	["RecurringProductsScreen", recurring],
	["OffersScreen", offers],
	["HomeScreen", home],
];

for (const [name, text] of screens) {
	check(`${name}: el botón sólo aparece si la hoja tiene algo`, () => {
		assert.match(text, /\{conditions !== null && \(\s*<ConditionsButton/);
		assert.ok(text.includes("<PromoConditionsSheet"), "falta la hoja");
	});
}

check("el botón es un elemento accesible propio, con rol y rótulo", () => {
	const button = sheet.slice(sheet.indexOf("export function ConditionsButton"));
	assert.ok(button.includes('accessibilityRole="button"'));
	assert.ok(button.includes("accessibilityLabel={accessibilityLabel}"));
	assert.ok(button.includes("{CONDITIONS_BUTTON_TEXT}"), "el botón tiene que decir qué abre, no ser sólo un ícono");
	assert.equal(CONDITIONS_BUTTON_TEXT, "Condiciones");
	assert.match(button, /minHeight: 44/);
});

/** El fuente entre el rótulo de la card y el botón tiene que cerrar el
 * Pressable rotulado: si no, el botón quedó adentro y el lector de pantalla no
 * lo ve. */
function buttonOutsideLabelled(text: string, labelMarker: string): void {
	const labelAt = text.indexOf(labelMarker);
	assert.ok(labelAt > 0, `no encontré ${labelMarker}`);
	const buttonAt = text.indexOf("<ConditionsButton", labelAt);
	assert.ok(buttonAt > labelAt, "no encontré el botón después de la card");
	assert.ok(
		text.slice(labelAt, buttonAt).includes("</Pressable>"),
		"el botón quedó adentro del área con accessibilityLabel",
	);
}

check("Ofertas: el botón es hermano del área que abre el detalle, no hijo", () => {
	buttonOutsideLabelled(offers, "accessibilityLabel={spoken}");
});

check("Inicio: ídem en el carrusel", () => {
	buttonOutsideLabelled(home, "accessibilityLabel={spoken}");
});

check("Productos recurrentes: ídem con el encabezado desplegable", () => {
	buttonOutsideLabelled(recurring, "accessibilityLabel={`${p.description}.");
});

check("la hoja se cierra con atrás de Android y anuncia su título", () => {
	assert.match(sheet, /onRequestClose=\{onClose\}/);
	assert.match(sheet, /accessibilityViewIsModal/);
	assert.match(sheet, /<Text ref=\{titleRef\} style=\{styles\.title\} accessibilityRole="header">/);
	assert.match(sheet, /AccessibilityInfo\.setAccessibilityFocus/);
	assert.match(sheet, /accessibilityLabel="Cerrar condiciones"/);
});

check("las cards memoizadas no reciben closures nuevas por render", () => {
	for (const [name, text, tag] of [
		["OffersScreen", offers, "<OfferCard"],
		["RecurringProductsScreen", recurring, "<ProductCard"],
	] as const) {
		// `\s` después del nombre: sin él, `<OfferCard` matchea primero
		// `<OfferCardSkeleton … />` y el check mira el esqueleto.
		const use = text.match(new RegExp(`${tag}\\s[\\s\\S]*?\\/>`))?.[0];
		assert.ok(use, `no encontré ${tag}`);
		assert.ok(!/=>/.test(use), `${name}: ${tag} recibe una closure: ${use.trim()}`);
		assert.ok(use.includes("onOpenConditions={openConditions}"), `${name}: falta el callback estable`);
		assert.match(text, /const openConditions = useCallback\(/);
	}
});

check('el texto de pago "Con tarjeta o programa de" sigue igual y en la tarjeta', () => {
	assert.ok(
		recurring.includes('Con tarjeta o programa de {offer.retailerName}: {promos.payment.join(" · ")}'),
		"cambió el texto aprobado de las promos de pago",
	);
});

check("los precios grandes se achican antes de romper la línea a 360 dp", () => {
	for (const [name, text, style] of [
		["ProductOfferLine", offerLine, "styles.priceBig"],
		["ProductOfferLine", offerLine, "styles.unitPrice"],
		["OffersScreen", offers, "styles.priceNow"],
		["HomeScreen", home, "styles.priceNow"],
	] as const) {
		assert.match(
			text,
			new RegExp(`style=\\{${style.replace(".", "\\.")}\\} numberOfLines=\\{1\\} adjustsFontSizeToFit`),
			`${name}: ${style} puede partir o desbordar con un monto largo`,
		);
	}
});

check("los componentes nuevos usan tokens y no colores sueltos", () => {
	for (const [name, text] of [
		["PromoConditionsSheet", sheet],
		["ProductOfferLine", offerLine],
	] as const) {
		const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
		assert.ok(!/#[0-9A-Fa-f]{3,8}\b/.test(code), `${name} tiene un hex suelto`);
		assert.ok(!/rgba?\(/.test(code), `${name} tiene un rgba suelto`);
	}
});

check("el caveat de OCR ya no ocupa renglones en las cards del feed", () => {
	// Se mudó a la hoja; si vuelve a la card, la hoja lo dice dos veces.
	assert.ok(!offers.includes("puede no ser exacto."), "OffersScreen volvió a mostrar el aviso en la card");
	assert.ok(!home.includes("Porcentaje leído de la imagen"), "HomeScreen volvió a mostrar el aviso en la card");
});

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
