import { describePromo, type Offer, type PromoMechanic, type PromoWording } from "./offersApi";
import { describePromoLabel, pickProductPromo, readPromoLabels } from "./promoLabels";
import { displayProductName, isPromoLine } from "../utils/productName";

const BACKEND_URL = "https://ofertar-backend-ofertar-backend.qr2vg3.easypanel.host";

export interface BestOffer {
	retailerName: string;
	/** The catalog product this price is for. Shares the brand and the kind of
	 * product with what the user bought, but not necessarily the size or
	 * variety — so it must always be shown, never implied away. */
	productName: string | null;
	/** The retailer's own photo of that catalog product.
	 *
	 * Optional rather than merely nullable: the app ships independently of the
	 * backend, so a deploy that predates the field sends no key at all. Both
	 * that and an explicit null mean the same thing to the caller — draw the
	 * placeholder — which is why nothing here invents a stand-in URL. */
	imageUrl?: string | null;
	price: number;
	listPrice: number | null;
	discountPct: number | null;
	/** La primera etiqueta de promo, que es lo único que mandaba el backend
	 * cuando esto se escribió. Sigue siendo la fuente cuando `promoLabels` no
	 * viene. */
	promoLabel: string | null;
	/** Todas las etiquetas de promo de la cadena, no sólo la primera.
	 *
	 * Opcional y no meramente nullable, por el mismo motivo que `imageUrl`: la
	 * app se despliega aparte del backend, así que un deploy anterior al campo
	 * no manda la clave. Ausente y null significan lo mismo acá — caé a
	 * `promoLabel` — y por eso nada de esto inventa una lista vacía que se
	 * confunda con "el producto no tiene promos". */
	promoLabels?: string[] | null;
	/** Unidades que hay que llevar para que la promo aplique; 1 = sin condición.
	 * Misma semántica que `requiredQuantity` en el scraper. Opcional por lo
	 * mismo que arriba: mientras el backend no lo mande se infiere del texto de
	 * la etiqueta, que es peor pero no rompe nada. */
	requiredQuantity?: number | null;
	/** Precio unitario efectivo cumpliendo esa condición, cuando la cadena lo
	 * publica (COTO sí, los teasers de VTEX no). Null no significa "no hay
	 * promo": significa "no sabemos a cuánto sale la unidad", y ahí se muestra
	 * la mecánica sin número inventado. */
	promoUnitPrice?: number | null;
}

/** Same kind of product, different brand — populated only when the user has
 * "marcas alternativas" enabled in their profile. */
export interface AlternativeOffer {
	productName: string;
	brand: string | null;
	retailerName: string;
	price: number;
	listPrice: number | null;
	discountPct: number | null;
}

/** A regional campaign promotion. Unlike `BestOffer`, which is just today's
 * shelf price, these carry a validity window and the legal terms. */
export interface CampaignOffer {
	/** Id of the same promotion in the offers feed ("campaign:<externalId>"),
	 * or null on a backend that predates the field. Null simply means the row
	 * is not tappable. */
	offerId: string | null;
	retailerName: string | null;
	province: string | null;
	legalText: string | null;
	/** ISO-8601 as published by the retailer. */
	activeTo: string | null;
	imageUrl: string | null;
	/** Read off the promo image by OCR, so treat as a best guess. */
	discountPercentages: number[];
	/** How the discount applies. A conditional mechanic makes the headline
	 * percentage far less valuable than it looks: "70% en la 2da unidad" is not
	 * 70% off what you pay. */
	mechanic: PromoMechanic | null;
	/** The percentage rests on OCR of the promo image alone, with no campaign
	 * metadata behind it. Checked against the real creatives, the metadata is
	 * accurate and the OCR is the one that misreads digits — so this, and not
	 * the two sources disagreeing, is what the app hedges. */
	percentagesUnverified: boolean;
}

/** How to word a campaign promotion so the percentage is never read as a
 * straight discount. Returns null when there is nothing quantified to show.
 *
 * The rules themselves live in `describePromo` (offersApi), shared with the
 * offers feed — a promotion has to read the same on a product card as it does
 * in the carousel, and it used to be possible to change one and not the other.
 */
export function describeCampaignDiscount(offer: CampaignOffer): string | null {
	const promo = describePromo(offer.discountPercentages, offer.mechanic);
	return promo.generic ? null : promo.headline;
}

/** The percentage a campaign actually saves you, used for ranking only.
 * A second-unit deal discounts half of what you buy, a 3x2 is one free item in
 * three. Ranking on the headline number instead put a "70% en la 2da unidad"
 * above a real 30% off. */
function effectiveCampaignDiscount(offer: CampaignOffer): number {
	const headline = Math.max(0, ...offer.discountPercentages);
	switch (offer.mechanic) {
		case "second_unit":
			return headline / 2;
		case "3x2":
			return 100 / 3;
		case "2x1":
			return 50;
		case "percentage_off":
			return headline;
		default:
			// Same reasoning as describeCampaignDiscount: an unrecognised mechanic
			// is assumed conditional, so it cannot outrank a discount we can
			// actually vouch for.
			return headline / 2;
	}
}

export interface RecurringProduct {
	description: string;
	barcode: string | null;
	category: string | null;
	/** Times it appeared as a line item across all tickets. */
	purchaseCount: number;
	/** Distinct tickets (shopping trips) that included it. */
	ticketCount: number;
	/** Whether it appears in the reference ticket — the one passed to
	 * getRecurringProducts, or the most recent one when none was given. */
	inReferenceTicket: boolean;
	totalDiscounts: number;
	/** Unit price paid the last time they bought it. Beware for products sold
	 * by weight: it is per kilo, while an offer price is per package. */
	lastPaidPrice: number | null;
	/** ISO-8601 timestamp of that purchase. */
	lastPaidAt: string | null;
	bestOffer: BestOffer | null;
	campaignOffers: CampaignOffer[];
	alternativeOffers: AlternativeOffer[];
}

/**
 * Ordering shared by the home carousel and the full section: something the
 * user can act on today outranks something they merely buy often.
 *
 * The backend ranks by purchase frequency, which puts the staples nobody
 * discounts at the top — so the carousel, which takes the first three, read
 * "Sin oferta activa" three times while the real offers sat further down.
 * Products without an offer keep the backend's frequency order among
 * themselves.
 */
export function sortByOfferRelevance(products: RecurringProduct[]): RecurringProduct[] {
	return [...products].sort((a, b) => {
		const aTier = offerTier(a);
		const bTier = offerTier(b);
		if (aTier !== bTier) return aTier - bTier;

		// Recurrence decides inside each group. Ranking by discount first
		// buried products the user actually buys often behind one-off purchases
		// that happened to carry a deeper percentage.
		if (a.ticketCount !== b.ticketCount) return b.ticketCount - a.ticketCount;
		if (a.purchaseCount !== b.purchaseCount) return b.purchaseCount - a.purchaseCount;

		// Equally recurrent: the bigger discount breaks the tie, and a catalog
		// offer with a real price beats a campaign that only promises a
		// percentage.
		const byDiscount = bestKnownDiscount(b) - bestKnownDiscount(a);
		if (byDiscount !== 0) return byDiscount;
		const aConcrete = a.bestOffer != null;
		const bConcrete = b.bestOffer != null;
		if (aConcrete !== bConcrete) return aConcrete ? -1 : 1;
		return 0;
	});
}

/** Lower sorts first. */
enum OfferTier {
	/** A campaign promotion on the brand the user buys. Above a catalog price
	 * because it expires: a shelf price will still be there next week, "70% en
	 * la 2da unidad" will not, so it is the one worth acting on now. Same
	 * reasoning the offers feed already applies when it puts campaigns at the
	 * head of a page. */
	Campaign = 0,
	/** A catalog price on the brand the user buys. */
	OwnBrand = 1,
	/** Only a different brand of the same kind of product is on offer. Still
	 * actionable, so it beats having nothing — but it asks the user to switch
	 * brands, which is why it does not compete with the tiers above. */
	OtherBrand = 2,
	None = 3,
}

function offerTier(product: RecurringProduct): OfferTier {
	// Checked before the catalog price: a product with both belongs at the top
	// on the strength of the promotion, not merged in with plain shelf prices.
	if (product.campaignOffers.length > 0) return OfferTier.Campaign;
	if (product.bestOffer != null) return OfferTier.OwnBrand;
	// Was missing entirely: a product whose only offer was an alternative brand
	// fell in with the products that had none and sank to the bottom by
	// purchase frequency.
	if (product.alternativeOffers.length > 0) return OfferTier.OtherBrand;
	return OfferTier.None;
}


/** Biggest discount we can claim for a product, from either source. Campaign
 * percentages come from OCR over a promo image and can be absent, in which
 * case the promotion still counts as an offer but ranks below anything with a
 * number attached. */
export function bestKnownDiscount(product: RecurringProduct): number {
	const fromCatalog = product.bestOffer?.discountPct ?? 0;
	const fromCampaigns = product.campaignOffers.reduce(
		(max, c) => Math.max(max, effectiveCampaignDiscount(c)),
		0,
	);
	return Math.max(fromCatalog, fromCampaigns);
}

/** La mecánica que hay que mostrar arriba de todo, ya redactada. */
export interface FeaturedPromo {
	wording: PromoWording;
	/** Unidades que hay que llevar; 1 = sin condición. */
	requiredQuantity: number;
	/** Precio por unidad cumpliendo la condición, o null si no lo sabemos. */
	unitPrice: number | null;
	/** La etiqueta cruda de la que salió, para no perderla de vista. */
	label: string;
}

/** Las promos de una oferta de catálogo, separadas por lo que realmente son. */
export interface OfferPromoSummary {
	/** La mecánica del producto: el 3x2, el "2da unidad al 70%", el "llevando
	 * 6". Null cuando no hay ninguna legible. */
	featured: FeaturedPromo | null;
	/** Etiquetas de tarjeta/banco/programa de la cadena.
	 *
	 * Se muestran, pero aparte y dichas como lo que son. No se descartan porque
	 * en Carrefour son el 100% de lo que publica el catálogo y tirarlas dejaría
	 * esa cadena sin ninguna información de promo; y no se muestran arriba
	 * porque un "Tarjeta Carrefour 20% Off Martes" en el lugar de la mecánica es
	 * exactamente la confusión que el usuario pidió sacar: no es un descuento
	 * del producto, es uno que sólo consigue quien paga con esa tarjeta un
	 * martes. */
	payment: string[];
	/** Lo que no pudimos clasificar y no está ya arriba. Se muestra crudo antes
	 * que perderlo: una etiqueta rara es peor mostrada mal que no mostrada, pero
	 * peor todavía es no mostrarla. */
	other: string[];
}

/**
 * Qué promoción aplica sobre el precio de catálogo.
 *
 * La pantalla de recurrentes mostraba "Mejor en Carrefour" y un renglón
 * chiquito con la etiqueta cruda, así que un 3x2 y un descuento con tarjeta se
 * veían igual. Acá se separan: la mecánica del producto sale redactada por
 * `describePromoLabel` (que a su vez delega en `describePromo`, la única
 * autoridad de redacción), las bancarias van a su propio balde.
 */
export function summarizeOfferPromos(offer: BestOffer): OfferPromoSummary {
	// El array completo cuando el backend ya lo manda; si no, la única etiqueta
	// que mandaba antes. Es el degradado del que habla `promoLabels`.
	const labels = offer.promoLabels ?? (offer.promoLabel ? [offer.promoLabel] : []);
	const readings = readPromoLabels(labels);
	const payment = readings.filter((r) => r.kind === "payment").map((r) => r.label);

	const best = pickProductPromo(readings);
	const wording = best ? describePromoLabel(best) : null;
	// `generic` es "hay algo pero no sabemos qué": no da para el tratamiento
	// grande, así que la etiqueta cae a `other` y se muestra cruda.
	const featured = best && wording && !wording.generic ? { best, wording } : null;

	// La cantidad del backend manda cuando viene, pero sólo si coincide con la
	// que dice la etiqueta que elegimos: el `promoUnitPrice` que la acompaña es
	// el precio de ESA condición, y pegarlo a otra sería inventar un número.
	const backendQuantity = offer.requiredQuantity ?? null;
	const unitPrice =
		featured && backendQuantity === featured.best.requiredQuantity
			? offer.promoUnitPrice ?? null
			: null;

	const other = readings
		.filter((r) => r.kind !== "payment" && r.label !== featured?.best.label)
		.map((r) => r.label);

	return {
		featured: featured
			? {
					wording: featured.wording,
					requiredQuantity: featured.best.requiredQuantity,
					unitPrice,
					label: featured.best.label,
				}
			: null,
		payment,
		other,
	};
}

/** What the offer saves against that retailer's own list price. Null when the
 * retailer published no list price, or one that isn't actually higher — a
 * "discount" that saves nothing is worse than saying nothing. */
export function offerSavings(offer: BestOffer): { amount: number; pct: number } | null {
	if (offer.listPrice == null || offer.listPrice <= offer.price) return null;
	const amount = offer.listPrice - offer.price;
	return { amount, pct: offer.discountPct ?? (amount / offer.listPrice) * 100 };
}

/** Products the user buys regularly. Pass `ticketId` to check them against a
 * specific ticket (e.g. the one just scanned) instead of the latest one. */
export async function getRecurringProducts(
	token: string,
	ticketId?: number,
): Promise<RecurringProduct[]> {
	const query = ticketId != null ? `?ticketId=${ticketId}` : "";
	const response = await fetch(`${BACKEND_URL}/products/recurring${query}`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: "Error desconocido" }));
		throw new Error(error.message || `Error ${response.status}`);
	}

	const products = (await response.json()) as RecurringProduct[];
	// The app ships independently of the backend, and these list fields are
	// read with `.length` all over the screens. Against a backend that predates
	// them, an undefined here takes the whole screen down instead of degrading.
	// A promotion the register printed ("2 POR 97.00 (21.00%)") is not a product
	// the user buys; the OCR reads it as one.
	return products
		.filter((p) => !isPromoLine(p.description))
		.map((p) => ({
			...p,
			description: displayProductName(p.description),
			bestOffer: p.bestOffer && {
				...p.bestOffer,
				productName: p.bestOffer.productName && displayProductName(p.bestOffer.productName),
			},
			campaignOffers: p.campaignOffers ?? [],
			alternativeOffers: (p.alternativeOffers ?? []).map((alt) => ({
				...alt,
				productName: displayProductName(alt.productName),
			})),
		}));
}

/**
 * The feed entry for a campaign the product matched.
 *
 * The offers screen shows a promotion in full — untruncated legal text and
 * all — so tapping one here should land there rather than retell it. The feed
 * is paged, though, and a promotion from a chain outside the user's
 * favourites may never appear in it, so this rebuilds the same offer from
 * what the match already carries and hands it over as a fallback.
 */
export function campaignOfferToOffer(campaign: CampaignOffer): Offer | null {
	if (!campaign.offerId) return null;
	return {
		id: campaign.offerId,
		kind: "campaign",
		retailerSlug: null,
		retailerName: campaign.retailerName,
		headline: describeCampaignDiscount(campaign) ?? "Promoción vigente",
		productName: null,
		brand: null,
		category: null,
		price: null,
		listPrice: null,
		discountPct: null,
		imageUrl: campaign.imageUrl,
		url: null,
		province: campaign.province,
		activeTo: campaign.activeTo,
		legalText: campaign.legalText,
		percentagesUnverified: campaign.percentagesUnverified,
		mechanic: campaign.mechanic,
		discountPercentages: campaign.discountPercentages,
	};
}
