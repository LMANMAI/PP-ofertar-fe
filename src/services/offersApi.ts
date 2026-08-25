const BACKEND_URL = "https://ofertar-backend-ofertar-backend.qr2vg3.easypanel.host";

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
	const palette = ["#0D80CC", "#E8613C", "#1F9D55", "#7C3AED", "#D97706", "#0F766E"];
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
	return { ...body, items: body.items ?? [] };
}
