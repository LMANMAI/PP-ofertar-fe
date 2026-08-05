const BACKEND_URL = "https://ofertar-backend-ofertar-backend.qr2vg3.easypanel.host";

export interface TicketItemResponse {
	id: number;
	description: string;
	rawDescription: string | null;
	quantity: number;
	unitPrice: number;
	originalPrice: number | null;
	subtotal: number | null;
	barcode: string | null;
	category: string | null;
	discountAmount: number | null;
	discountDescription: string | null;
}

export interface TicketResponse {
	id: number;
	storeName: string | null;
	ticketId: string | null;
	total: number | null;
	subtotal: number | null;
	totalDiscounts: number | null;
	status: "PENDING" | "PROCESSED" | "FAILED";
	createdAt: string;
	items: TicketItemResponse[];
}

export interface SavingsReportResponse {
	summary: {
		totalSavings: number;
		totalSpent: number;
		ticketCount: number;
		averageSavings: number;
	};
	byCategory: Array<{
		category: string;
		totalDiscounts: number;
		itemCount: number;
	}>;
	byStore: Array<{
		storeName: string;
		totalDiscounts: number;
		ticketCount: number;
	}>;
	timeline: Array<{
		period: string;
		totalDiscounts: number;
		ticketCount: number;
	}>;
	topProducts: Array<{
		description: string;
		barcode: string | null;
		category: string | null;
		purchaseCount: number;
		totalDiscounts: number;
	}>;
}

export type UpdateTicketData = {
	storeName?: string;
	items: Array<{
		id?: number;
		description?: string;
		quantity?: number;
		unitPrice?: number;
		originalPrice?: number;
		discountAmount?: number;
	}>;
};

export async function scanTicket(
	token: string,
	photos: { uri: string; base64: string; id?: string }[],
	contentType?: string,
): Promise<TicketResponse> {
	const formData = new FormData();

	photos.forEach((photo, index) => {
		const extension = contentType === "application/pdf" ? "pdf" : "jpg";
		formData.append("file", {
			uri: photo.uri,
			type: contentType || "image/jpeg",
			name: `ticket-${index}.${extension}`,
		} as any);
	});

	const response = await fetch(`${BACKEND_URL}/tickets/scan`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
		},
		body: formData,
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: "Error desconocido" }));
		throw new Error(error.message || `Error ${response.status}`);
	}

	return response.json();
}

export async function getTickets(token: string): Promise<TicketResponse[]> {
	const response = await fetch(`${BACKEND_URL}/tickets`, {
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

export async function getTicket(token: string, id: number): Promise<TicketResponse> {
	const response = await fetch(`${BACKEND_URL}/tickets/${id}`, {
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

export async function updateTicket(
	token: string,
	id: number,
	data: UpdateTicketData,
): Promise<TicketResponse> {
	const response = await fetch(`${BACKEND_URL}/tickets/${id}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: "Error desconocido" }));
		throw new Error(error.message || `Error ${response.status}`);
	}

	return response.json();
}

export async function deleteTicket(token: string, id: number): Promise<void> {
	const response = await fetch(`${BACKEND_URL}/tickets/${id}`, {
		method: "DELETE",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: "Error desconocido" }));
		throw new Error(error.message || `Error ${response.status}`);
	}
}

export async function getSavingsReport(
	token: string,
	from?: string,
	to?: string,
): Promise<SavingsReportResponse> {
	const params = new URLSearchParams();
	if (from) params.append("from", from);
	if (to) params.append("to", to);

	const queryString = params.toString();
	const url = `${BACKEND_URL}/savings/report${queryString ? `?${queryString}` : ""}`;

	const response = await fetch(url, {
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
