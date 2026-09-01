import { describePromo, type PromoMechanic } from "./offersApi";

const BACKEND_URL = "https://ofertar-backend-ofertar-backend.qr2vg3.easypanel.host";

export interface BestOffer {
	retailerName: string;
	/** The catalog product this price is for. Shares the brand and the kind of
	 * product with what the user bought, but not necessarily the size or
	 * variety — so it must always be shown, never implied away. */
	productName: string | null;
	price: number;
	listPrice: number | null;
	discountPct: number | null;
	promoLabel: string | null;
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
	/** An offer on the brand the user actually buys: catalog price or campaign. */
	OwnBrand = 0,
	/** Only a different brand of the same kind of product is on offer. Still
	 * actionable, so it beats having nothing — but it asks the user to switch
	 * brands, which is why it does not compete with the tier above. */
	OtherBrand = 1,
	None = 2,
}

function offerTier(product: RecurringProduct): OfferTier {
	if (product.bestOffer != null || product.campaignOffers.length > 0) return OfferTier.OwnBrand;
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
function bestKnownDiscount(product: RecurringProduct): number {
	const fromCatalog = product.bestOffer?.discountPct ?? 0;
	const fromCampaigns = product.campaignOffers.reduce(
		(max, c) => Math.max(max, effectiveCampaignDiscount(c)),
		0,
	);
	return Math.max(fromCatalog, fromCampaigns);
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
	return products.map((p) => ({
		...p,
		campaignOffers: p.campaignOffers ?? [],
		alternativeOffers: p.alternativeOffers ?? [],
	}));
}
