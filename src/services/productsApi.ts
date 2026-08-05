const BACKEND_URL = "https://ofertar-backend-ofertar-backend.qr2vg3.easypanel.host";

export interface BestOffer {
	retailerName: string;
	price: number;
	listPrice: number | null;
	discountPct: number | null;
	promoLabel: string | null;
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
	bestOffer: BestOffer | null;
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

	return response.json();
}
