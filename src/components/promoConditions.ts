import {
	campaignOfferToOffer,
	describeCampaignDiscount,
	offerSavings,
	summarizeOfferPromos,
	type BestOffer,
	type CampaignOffer,
	type RecurringProduct,
} from "../services/productsApi";
import { offerPromo, type Offer, type PromoIcon } from "../services/offersApi";
import { formatCurrency, formatLongDate } from "../utils/format";

/**
 * Qué va en la tarjeta y qué va en la hoja de condiciones.
 *
 * El pedido de producto: las tarjetas de descuento tenían tanto texto
 * explicativo que el número importante —cuánto se paga— quedaba enterrado, y
 * el usuario tenía que hacer la cuenta con el "-25%". La tarjeta pasa a decir
 * **cuánto pagás y dónde**; la letra chica (legales, topes de unidades, avisos
 * de OCR, vigencia completa) se va a `PromoConditionsSheet`.
 *
 * Módulo plano y no el .tsx de al lado, por lo mismo que `forgottenProducts`:
 * es la regla que decide qué ve el usuario de entrada, y tiene que poder
 * verificarse sin levantar React Native (`scripts/verifyPromoConditions.ts`).
 *
 * Tres reglas que vienen de bugs reales y que este módulo sostiene:
 *
 *  1. **La condición de una promo no es letra chica.** En un 3x2 o un "2da al
 *     70%", una sola unidad cuesta el precio de góndola; ya pasó que un
 *     producto a precio lleno apareciera bajo "Mejor en X". Por eso la
 *     condición viaja en el `hero` —la parte grande de la tarjeta—, pegada al
 *     número, y la hoja nunca es el único lugar donde se lee.
 *  2. **No se inventa un precio por unidad.** Sólo se muestra el que publica
 *     la cadena (`promoUnitPrice`, que `summarizeOfferPromos` ya ata a su
 *     condición). Sin ese dato la protagonista es la mecánica ("3x2"), no una
 *     cuenta nuestra: `price * 2 / 3` supone que el 3x2 se aplica sobre ese
 *     precio y no sobre el de lista, y eso no lo sabemos.
 *  3. **Los topes de reintegro y las compras mínimas no se extraen.** Sólo
 *     existen adentro del `legalText` en prosa libre; un monto mal leído en
 *     grande es peor que no mostrarlo. El legal va entero, tal cual, a la hoja.
 */

/** El precio de UNA unidad, que en una promo condicional nunca desaparece de
 * la tarjeta: puede ir más chico, pero tiene que estar. */
export interface SinglePrice {
	price: number;
	/** Listo para mostrar: "Llevando 1 sola unidad pagás $1.800". */
	text: string;
}

/**
 * Lo que va grande en la tarjeta.
 *
 *  - `price`: rebaja lisa o precio sin promo. El precio final grande y, si la
 *    cadena publicó uno más alto, el de lista tachado. `discountPct` sólo
 *    viene cuando NO hay precio de lista que tachar: con el tachado a la vista
 *    el porcentaje es una cuenta que el usuario no necesita.
 *  - `unitPrice`: promo condicional con precio por unidad publicado. El número
 *    grande es ese, y `condition` ("llevando 3") va en la misma unidad visual.
 *  - `mechanic`: promo condicional sin precio por unidad, o una campaña (que no
 *    trae precio). La mecánica es la protagonista y `applies` dice la
 *    condición.
 */
export type OfferHero =
	| { kind: "price"; price: number; listPrice: number | null; discountPct: number | null }
	| { kind: "unitPrice"; unitPrice: number; condition: string; single: SinglePrice }
	| {
			kind: "mechanic";
			amount: string | null;
			capped: boolean;
			/** La condición. Null sólo en una oferta de catálogo sin precio, donde
			 * la tarjeta ya muestra el nombre del producto al lado. */
			applies: string | null;
			icon: PromoIcon;
			conditional: boolean;
			single: SinglePrice | null;
	  };

function singlePrice(price: number, requiredQuantity: number): SinglePrice {
	return {
		price,
		// Con condición de cantidad, la frase de siempre: es la que dice sin
		// vueltas que una sola unidad no baja. Sin ella (una etiqueta que no
		// supimos leer), "publicado" y no "sin la promo": no sabemos si ese
		// precio ya la incluye.
		text:
			requiredQuantity > 1
				? `Llevando 1 sola unidad pagás ${formatCurrency(price)}`
				: `Precio publicado: ${formatCurrency(price)}`,
	};
}

/**
 * El `hero` de un producto recurrente (el precio de catálogo que encontró el
 * backend para algo que el usuario compra).
 *
 * `loose` = el precio es probablemente de otro producto (`isLooseMatch`): se
 * muestra el precio y nada más. Ni tachado ni mecánica, porque ese descuento
 * no es de lo que el usuario compró — la misma regla que ya tenía
 * `ProductOfferLine`.
 */
export function productOfferHero(offer: BestOffer, loose: boolean): OfferHero {
	if (loose) return { kind: "price", price: offer.price, listPrice: null, discountPct: null };

	const featured = summarizeOfferPromos(offer).featured;
	// Mismo criterio que decidía antes si la tarjeta mostraba el bloque de la
	// mecánica: un "X% de descuento" liso ya está dicho por el precio; lo que
	// no es obvio es lo condicional.
	if (featured && (featured.wording.conditional || featured.requiredQuantity > 1)) {
		const qty = featured.requiredQuantity;
		const single = singlePrice(offer.price, qty);
		// El precio por unidad sólo si lo publicó la cadena para ESTA condición
		// (ya filtrado en `summarizeOfferPromos`) y si es menor que el de una
		// sola unidad. Uno mayor o igual no es una promo, es un dato roto, y
		// ponerlo grande diría lo contrario de lo que pasa en la caja.
		const unit = featured.unitPrice;
		if (qty > 1 && unit != null && unit > 0 && unit < offer.price) {
			return { kind: "unitPrice", unitPrice: unit, condition: `llevando ${qty}`, single };
		}
		const w = featured.wording;
		return {
			kind: "mechanic",
			amount: w.amount,
			capped: w.capped,
			applies: w.applies,
			icon: w.icon,
			conditional: w.conditional,
			single,
		};
	}

	if (offerSavings(offer)) {
		return { kind: "price", price: offer.price, listPrice: offer.listPrice, discountPct: null };
	}
	const pct = offer.discountPct;
	return {
		kind: "price",
		price: offer.price,
		listPrice: null,
		discountPct: pct != null && pct >= 1 ? Math.round(pct) : null,
	};
}

/**
 * El `hero` de una oferta del feed (Inicio y Ofertas).
 *
 * Una campaña no trae precio, así que es siempre `mechanic`: el número de la
 * creatividad y a qué se aplica. Una oferta de catálogo con precio es
 * `price`. Los dos fallbacks copian lo que ya hacían las cards: sin precio, el
 * porcentaje en el tile; con un backend viejo sin mecánica, el `headline` que
 * ya venía redactado.
 */
export function offerCardHero(offer: Offer): OfferHero {
	if (offer.kind === "catalog") {
		const pct = offer.discountPct != null && offer.discountPct >= 1 ? Math.round(offer.discountPct) : null;
		if (offer.price != null) {
			const list = offer.listPrice != null && offer.listPrice > offer.price ? offer.listPrice : null;
			return { kind: "price", price: offer.price, listPrice: list, discountPct: list == null ? pct : null };
		}
		return {
			kind: "mechanic",
			amount: pct != null ? `${pct}%` : null,
			capped: false,
			applies: null,
			icon: "pricetag-outline",
			conditional: false,
			single: null,
		};
	}
	const promo = offerPromo(offer);
	if (promo) {
		return {
			kind: "mechanic",
			amount: promo.amount,
			capped: promo.capped,
			applies: promo.applies,
			icon: promo.icon,
			conditional: promo.conditional,
			single: null,
		};
	}
	return {
		kind: "mechanic",
		amount: null,
		capped: false,
		applies: offer.headline,
		icon: "pricetag-outline",
		conditional: false,
		single: null,
	};
}

/** El `hero` dicho en una frase, para el `accessibilityLabel` de la tarjeta.
 * Lee lo mismo que se ve y en el mismo orden: el número y su condición juntos. */
export function heroSpoken(hero: OfferHero): string {
	switch (hero.kind) {
		case "price":
			return [
				formatCurrency(hero.price),
				hero.listPrice != null ? `antes ${formatCurrency(hero.listPrice)}` : null,
				hero.discountPct != null ? `${hero.discountPct}% de descuento` : null,
			]
				.filter(Boolean)
				.join(", ");
		case "unitPrice":
			return `${formatCurrency(hero.unitPrice)} por unidad ${hero.condition}, ${hero.single.text}`;
		case "mechanic":
			return [
				hero.amount ? `${hero.capped ? "Hasta " : ""}${hero.amount}` : null,
				hero.applies,
				hero.single?.text ?? null,
			]
				.filter(Boolean)
				.join(", ");
	}
}

// ---------------------------------------------------------------------------
// La hoja de condiciones
// ---------------------------------------------------------------------------

/** Rótulo visible del botón que abre la hoja. Corto a propósito: vive en una
 * tarjeta que se lee a 360 dp. */
export const CONDITIONS_BUTTON_TEXT = "Condiciones";

/** Título de la hoja; es también lo que anuncia el lector de pantalla al
 * abrirla. */
export const CONDITIONS_TITLE = "Condiciones de la promoción";

export type ConditionsBlockKind =
	/** La explicación de la mecánica. Contexto: la condición en sí ya está en
	 * la tarjeta, esto es la frase larga que antes la saturaba. */
	| "applies"
	/** La vigencia completa. Contexto: en Ofertas e Inicio ya está en la card. */
	| "validity"
	/** "Máx. 8 unidades". */
	| "unitCap"
	/** Una campaña con su vigencia, su legal y el acceso al detalle. */
	| "campaign"
	/** Avisos sobre la calidad del dato: porcentaje leído por OCR, varios
	 * porcentajes en el mismo aviso. */
	| "notice"
	/** El `legalText` entero, sin interpretar. */
	| "legal";

export interface ConditionsLine {
	text: string;
	/** `legal` se dibuja más chico; `warning` con el tono de aviso. */
	tone: "body" | "legal" | "warning";
}

export interface ConditionsBlock {
	key: string;
	kind: ConditionsBlockKind;
	title: string;
	lines: ConditionsLine[];
	/** Oferta completa que abre "Ver la promoción completa" desde este bloque. */
	full: Offer | null;
}

export interface PromoConditions {
	title: string;
	/** Para quién son estas condiciones: súper y producto. */
	subtitle: string | null;
	blocks: ConditionsBlock[];
	/** "Ver la promoción completa" al pie de la hoja, para la oferta entera. */
	full: Offer | null;
}

/**
 * Lo que justifica abrir la hoja. `applies` y `validity` no están: son
 * contexto que se muestra si la hoja se abre por otra cosa, pero solos no
 * valen un botón — la condición ya está en la tarjeta y, en las cards del
 * feed, la vigencia también. Un botón "Condiciones" que abre una hoja que
 * repite la tarjeta enseña al usuario a no tocarlo.
 */
const SUBSTANTIVE: ReadonlySet<ConditionsBlockKind> = new Set<ConditionsBlockKind>([
	"unitCap",
	"campaign",
	"notice",
	"legal",
]);

/** Null cuando no hay nada sustantivo: es lo que hace que el botón no aparezca. */
function finish(
	subtitle: string | null,
	blocks: ConditionsBlock[],
	full: Offer | null,
): PromoConditions | null {
	if (!blocks.some((b) => SUBSTANTIVE.has(b.kind))) return null;
	return { title: CONDITIONS_TITLE, subtitle, blocks, full };
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Días de calendario hasta `iso`, con la misma lectura de fecha-sin-hora que
 * `formatLongDate` (un día local, no la medianoche UTC del día anterior). */
function calendarDaysUntil(iso: string, now: Date): number | null {
	const m = DATE_ONLY.exec(iso);
	const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
	// `round` y no `floor`: un cambio de horario deja 23 o 25 horas entre dos
	// medianoches locales.
	return Math.round((day(d) - day(now)) / 86_400_000);
}

/** "Vigente hasta el 3 de septiembre · quedan 2 días", o que no se informó. */
export function validityText(iso: string | null, now: Date = new Date()): string {
	const until = formatLongDate(iso);
	if (!iso || !until) return "Vigencia no informada";
	const days = calendarDaysUntil(iso, now);
	const urgency =
		days == null || days < 0 || days > 7
			? ""
			: days === 0
				? " · vence hoy"
				: ` · quedan ${days} día${days === 1 ? "" : "s"}`;
	return `Vigente hasta el ${until}${urgency}`;
}

/** El legal tal cual, partido en párrafos. Nada se lee de adentro: ver la
 * regla 3 de la cabecera. */
function legalLines(text: string | null | undefined): ConditionsLine[] {
	return (text ?? "")
		.split(/\n+/)
		.map((t) => t.trim())
		.filter((t) => t !== "")
		.map((t) => ({ text: t, tone: "legal" as const }));
}

/** Whether any shown promotion carries OCR-read percentages, which is what the
 * "verificá en el local" disclaimer qualifies. */
export function hasGuessedPercentages(offers: CampaignOffer[]): boolean {
	// Only the OCR-only ones. A percentage taken from the campaign's own
	// metadata is not a guess, and warning about it would undersell a number
	// that is in fact reliable.
	return offers.some((c) => c.percentagesUnverified && c.discountPercentages.length > 0);
}

/** Cuántas campañas entran en una tarjeta de producto recurrente. Las mismas
 * que la hoja detalla, para que el "y N más" del chip no prometa otras. */
export const MAX_CAMPAIGNS_SHOWN = 3;

/**
 * La hoja de una oferta del feed (Ofertas, Inicio).
 *
 * La tarjeta entera ya abre el detalle, así que "Ver la promoción completa" no
 * alcanza sola para justificar el botón: hace falta un legal, o un aviso sobre
 * el porcentaje, que son lo que antes ocupaba renglones en cursiva al pie.
 */
export function offerConditions(offer: Offer, now: Date = new Date()): PromoConditions | null {
	const promo = offerPromo(offer);
	const blocks: ConditionsBlock[] = [];

	if (promo?.conditional) {
		blocks.push({
			key: "applies",
			kind: "applies",
			title: "Cómo se aplica",
			lines: [{ text: promo.detail, tone: "body" }],
			full: null,
		});
	}

	// Mismo filtro que `describePromo`, para que la hoja no contradiga el
	// "HASTA" del tile.
	const everyPct = [
		...new Set((offer.discountPercentages ?? []).filter((n) => n > 0 && n <= 100)),
	];
	if (promo?.capped && everyPct.length > 1) {
		blocks.push({
			key: "several",
			kind: "notice",
			title: "Sobre el porcentaje",
			lines: [
				{
					text: `El aviso muestra más de un porcentaje (${everyPct.map((p) => `${p}%`).join(", ")}) y no dice a qué producto va cada uno, así que mostramos el mayor.`,
					tone: "warning",
				},
			],
			full: null,
		});
	}
	if (offer.percentagesUnverified) {
		blocks.push({
			key: "unverified",
			kind: "notice",
			title: "Sobre el porcentaje",
			lines: [
				{
					text: "El porcentaje se leyó de la imagen de la promoción y puede no ser exacto. Confirmalo en el local.",
					tone: "warning",
				},
			],
			full: null,
		});
	}

	blocks.push({
		key: "validity",
		kind: "validity",
		title: "Vigencia",
		lines: [{ text: validityText(offer.activeTo, now), tone: "body" }],
		full: null,
	});

	const legal = legalLines(offer.legalText);
	if (legal.length > 0) {
		blocks.push({ key: "legal", kind: "legal", title: "Legales", lines: legal, full: null });
	}

	const what = offer.kind === "catalog" ? offer.productName : promo?.headline ?? offer.headline;
	const subtitle = [offer.retailerName, what].filter(Boolean).join(" · ") || null;
	return finish(subtitle, blocks, offer);
}

/**
 * La hoja de un producto recurrente.
 *
 * Reúne lo que antes vivía en el detalle desplegado y al pie de la tarjeta: el
 * tope de unidades de la promo de catálogo y las campañas con su vigencia, sus
 * legales y el acceso a verlas enteras. Las etiquetas de tarjeta o programa de
 * la cadena NO vienen acá: son otra promoción, no la letra chica de esta, y
 * siguen en el detalle con su texto aprobado.
 */
export function productConditions(
	product: RecurringProduct,
	loose: boolean,
	now: Date = new Date(),
): PromoConditions | null {
	const offer = product.bestOffer;
	const featured = offer ? summarizeOfferPromos(offer).featured : null;
	const blocks: ConditionsBlock[] = [];

	if (featured && (featured.wording.conditional || featured.requiredQuantity > 1)) {
		blocks.push({
			key: "applies",
			kind: "applies",
			title: loose ? "Cómo se aplica (precio de otro producto)" : "Cómo se aplica",
			lines: [{ text: featured.wording.detail, tone: "body" }],
			full: null,
		});
	}

	if (featured?.maxUnits != null) {
		blocks.push({
			key: "unitCap",
			kind: "unitCap",
			title: "Tope de unidades",
			lines: [{ text: `Máx. ${featured.maxUnits} unidades por compra con esta promoción.`, tone: "body" }],
			full: null,
		});
	}

	const campaigns = product.campaignOffers.slice(0, MAX_CAMPAIGNS_SHOWN);
	campaigns.forEach((c, i) => {
		const where = `${c.retailerName ?? "tu súper"}${c.province ? ` · ${c.province}` : ""}`;
		blocks.push({
			key: `campaign-${i}`,
			kind: "campaign",
			title: `${describeCampaignDiscount(c) ?? "Promoción vigente"} en ${where}`,
			lines: [{ text: validityText(c.activeTo, now), tone: "body" }, ...legalLines(c.legalText)],
			full: campaignOfferToOffer(c),
		});
	});

	if (hasGuessedPercentages(campaigns)) {
		blocks.push({
			key: "guessed",
			kind: "notice",
			title: "Sobre los porcentajes",
			lines: [
				{
					text: "Algún porcentaje se leyó de la imagen de la promoción y puede no ser exacto, confirmalo en el local.",
					tone: "warning",
				},
			],
			full: null,
		});
	}

	return finish(product.description, blocks, null);
}
