import { displayProductName } from "../utils/productName";

const BACKEND_URL = "https://ofertar-backend-ofertar-backend.qr2vg3.easypanel.host";

/** How a campaign discount applies. Mirrors the scraper's `promoMechanic`
 * exactly; anything the scraper cannot classify arrives as null. */
export type PromoMechanic = "second_unit" | "3x2" | "2x1" | "percentage_off";

/** Ionicons glyph names, kept as a literal union so this module stays free of
 * UI imports while still type-checking against the `name` prop. */
export type PromoIcon =
	| "layers-outline"
	| "gift-outline"
	| "pricetag-outline"
	| "information-circle-outline";

export interface PromoWording {
	/** The one thing to show big: "50%", "3x2", "2x1" — or null when the
	 * promotion carries nothing quantified at all. */
	amount: string | null;
	/** `amount` is a ceiling, not a promise: either the creative advertised
	 * several percentages, or we could not read how the discount applies. Shown
	 * as a "HASTA" kicker so the number is never read as a flat rate. */
	capped: boolean;
	/** The answer to "¿sobre qué se aplica?" — the question the card was not
	 * answering, which is what made "50% / 12% de descuento" useless. */
	applies: string;
	/** The same thing as a sentence, for screens with room for one. */
	detail: string;
	/** One-line version. Must stay identical to `campaignHeadline` in
	 * OfferFeedClient.java, so a promotion reads the same in the feed as it does
	 * on a product card. */
	headline: string;
	icon: PromoIcon;
	/** The discount is not simply taken off the price — it needs a second unit,
	 * a trio, or a condition we could not read. Drives the warm accent on the
	 * cards, and follows the same assume-conditional policy as the ranking in
	 * `effectiveCampaignDiscount`: an unrecognised mechanic counts as one.
	 */
	conditional: boolean;
	/** Nothing quantified and no mechanic — all we can honestly say is that the
	 * supermarket has something running. */
	generic: boolean;
}

/**
 * Wording for a campaign promotion, from the two things the pipeline actually
 * knows: the percentages read off the creative and how the discount applies.
 *
 * On several percentages. A campaign row is one creative (col1, the percentage
 * banner) and `bestGuessPercentages` are the numbers found on that single
 * image — either from Carrefour's own filename convention ("25_35marcas..." =
 * 25 and 35) or, failing that, from OCR of the banner text. Nothing in the
 * pipeline records which condition each number belongs to: the two-column
 * layouts that produce them are two offers sharing one banner, and the OCR
 * path can just as easily pick up an unrelated percentage printed in the small
 * print. Listing them ("50% / 12% de descuento") therefore asserted a
 * relationship the data does not have. We show the ceiling and say "hasta",
 * which is the only claim every one of those cases supports.
 *
 * On the mechanic. `second_unit`/`3x2`/`2x1` are positive detections and are
 * always spelled out, because a "70% en la 2da unidad" is worth half of what
 * it looks like. `percentage_off` is the residual bucket — a percentage with
 * no multi-unit condition found — so it is worded as a discount on the price
 * and nothing stronger. A null mechanic gets no discount wording at all.
 */
export function describePromo(
	percentages: number[] | null | undefined,
	mechanic: PromoMechanic | null | undefined,
): PromoWording {
	// Deduplicated: the same number twice is still one advertised discount, and
	// "Hasta 50%" for a banner whose only number is 50 would hedge for nothing.
	// The OCR path already dedupes; the filename path ("50_50...") does not.
	const valid = [
		...new Set((percentages ?? []).filter((n) => Number.isFinite(n) && n > 0 && n <= 100)),
	];
	const top = valid.length > 0 ? Math.max(...valid) : null;
	const pct = top === null ? null : `${top}%`;
	// More than one number on the banner: we can vouch for the best of them
	// being advertised, not for any single product carrying it.
	const several = valid.length > 1;
	const prefix = several ? "Hasta " : "";

	switch (mechanic) {
		case "second_unit":
			return {
				amount: pct,
				capped: several,
				applies: "En la 2da unidad",
				detail: "El porcentaje se descuenta de la segunda unidad, no de la primera.",
				headline: pct ? `${prefix}${pct} en la 2da unidad` : "Descuento en la 2da unidad",
				icon: "layers-outline",
				conditional: true,
				generic: false,
			};
		case "3x2":
			return {
				amount: "3x2",
				capped: false,
				applies: "Llevás 3, pagás 2",
				detail: "Llevando 3 unidades pagás 2.",
				// A percentage on the same banner belongs to some other offer on
				// it, so it is deliberately not folded into this headline.
				headline: "3x2",
				icon: "gift-outline",
				conditional: true,
				generic: false,
			};
		case "2x1":
			return {
				amount: "2x1",
				capped: false,
				applies: "Llevás 2, pagás 1",
				detail: "Llevando 2 unidades pagás 1.",
				headline: "2x1",
				icon: "gift-outline",
				conditional: true,
				generic: false,
			};
		case "percentage_off":
			if (pct) {
				return {
					amount: pct,
					capped: several,
					applies: "Descuento sobre el precio",
					detail: "El porcentaje se descuenta del precio del producto.",
					headline: `${prefix}${pct} de descuento`,
					icon: "pricetag-outline",
					conditional: false,
					generic: false,
				};
			}
			break;
	}

	// Unknown mechanic, or a percentage_off with no readable percentage. Never
	// worded as a straight discount: if the scraper starts emitting a new
	// conditional mechanic, failing open here would undo the whole point of the
	// field. The number, when there is one, is always a ceiling.
	return {
		amount: pct,
		capped: pct !== null,
		applies: pct ? "Consultá cómo se aplica" : "Promoción vigente",
		detail: pct
			? "No pudimos leer cómo se aplica el descuento. Consultá las condiciones en el súper."
			: "El súper tiene una promoción vigente. Consultá las condiciones en el local.",
		headline: pct ? `Promoción de hasta ${pct}` : "Promoción vigente",
		icon: "information-circle-outline",
		conditional: true,
		generic: pct === null,
	};
}

/** Wording for a feed offer, or null when it is a catalog (shelf-price) row or
 * when the backend is old enough that it only sent the pre-worded headline. */
export function offerPromo(offer: Offer): PromoWording | null {
	if (offer.kind !== "campaign") return null;
	if (offer.mechanic === undefined && offer.discountPercentages === undefined) return null;
	return describePromo(offer.discountPercentages, offer.mechanic);
}

/**
 * An offer running at one of the user's supermarkets, whether or not they buy
 * the product. This is the whole catalog of what is on sale at their chains —
 * the offers matched to what they actually buy live in the recurring-products
 * screen, which answers a different question.
 */
export interface Offer {
	id: string;
	/** "catalog" is a shelf price, "campaign" a promotion with a deadline. */
	kind: "catalog" | "campaign";
	retailerSlug: string | null;
	retailerName: string | null;
	/** Ready to display: "-25%", "50% en la 2da unidad". */
	headline: string;
	productName: string | null;
	brand: string | null;
	category: string | null;
	price: number | null;
	listPrice: number | null;
	discountPct: number | null;
	imageUrl: string | null;
	url: string | null;
	province: string | null;
	activeTo: string | null;
	legalText: string | null;
	/** The percentage rests on OCR of the promo image alone. */
	percentagesUnverified: boolean;
	/** Campaign only, and optional: a backend older than this field only sends
	 * the pre-worded `headline`. When it is missing the card falls back to that
	 * string instead of inventing structure it does not have. */
	mechanic?: PromoMechanic | null;
	/** Campaign only, optional for the same reason. Every percentage the
	 * creative advertises, not just the one we lead with. */
	discountPercentages?: number[] | null;
}

export interface OfferPage {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	items: Offer[];
}

export const ALL_CATEGORIES = "Todas";

/** Deterministic badge per chain, so a supermarket always looks the same
 * without hardcoding a palette that goes stale when a chain is added. */
export function offerBadge(retailerName: string | null): { badge: string; color: string } {
	const clean = (retailerName ?? "Súper").replace(/\s+argentina$/i, "").trim();
	let hash = 0;
	for (let i = 0; i < clean.length; i++) hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
	// Darker than the brand colors they derive from: the two letters sit on
	// the badge in white 10px bold, which needs ≥4.5:1 against these fills.
	const palette = ["#0369A1", "#C2410C", "#15803D", "#6D28D9", "#B45309", "#0F766E"];
	return { badge: clean.slice(0, 2).toUpperCase(), color: palette[hash % palette.length] };
}

/** Categories actually present in a page of offers. Built from the data so the
 * filter never offers a chip that matches nothing. */
export function offerCategories(offers: Offer[]): string[] {
	const found = new Set<string>();
	for (const o of offers) if (o.category) found.add(o.category);
	return [ALL_CATEGORIES, ...[...found].sort()];
}

export async function getOffers(token: string, page = 1, pageSize = 30): Promise<OfferPage> {
	const response = await fetch(`${BACKEND_URL}/offers?page=${page}&pageSize=${pageSize}`, {
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

	const body = (await response.json()) as OfferPage;
	// The app ships independently of the backend; an older one has no /offers
	// at all, and a partial payload should degrade rather than crash a screen.
	const items = (body.items ?? []).map((o) => ({
		...o,
		productName: o.productName && displayProductName(o.productName),
	}));
	return { ...body, items };
}
