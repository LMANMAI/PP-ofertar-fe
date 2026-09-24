import type { Offer, RecurringProduct } from "../services";

function normalize(value: string | null | undefined): string {
	return (value ?? "").trim().toLowerCase();
}

/** True when a feed offer is the very offer that one of the products the user
 * buys resolved to: a campaign by its id, a shelf price by catalog product and
 * chain. Shared by Inicio and Ofertas so the "De tu compra" tag means the same
 * thing on both. */
export function isInBasket(offer: Offer, products: RecurringProduct[]): boolean {
	return products.some((p) => {
		if (offer.kind === "campaign") {
			return p.campaignOffers.some((c) => c.offerId === offer.id);
		}
		const best = p.bestOffer;
		if (!best) return false;
		const name = normalize(best.productName);
		return name !== "" && name === normalize(offer.productName) && normalize(best.retailerName) === normalize(offer.retailerName);
	});
}
