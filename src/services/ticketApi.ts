import { File as ExpoFile } from "expo-file-system";
import { displayProductName } from "../utils/productName";
import type { components } from "../api/schema";
import { request, requestVoid } from "../api/client";
import { SavingsReportSchema, TicketListSchema, TicketSchema } from "../api/schemas";

export type TicketItemResponse = components["schemas"]["TicketItemResponse"];

/** `reviewed` es false hasta que el usuario abre el ticket terminado y lo confirma;
 * recién entonces deja de ser editable. */
export type TicketResponse = components["schemas"]["TicketResponse"];

export type SavingsReportResponse = components["schemas"]["SavingsReportResponse"];

function cleanTicket(ticket: TicketResponse): TicketResponse {
	return {
		...ticket,
		items: ticket.items.map((item) => ({ ...item, description: displayProductName(item.description) })),
	};
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
	// Uploaded as multipart by uri; base64 is unused here and stays optional
	// only because the PDF flow still carries it.
	photos: { uri: string; base64?: string; id?: string }[],
	contentType?: string,
): Promise<TicketResponse> {
	const formData = new FormData();

	photos.forEach((photo, index) => {
		const extension = contentType === "application/pdf" ? "pdf" : "jpg";
		// expo/fetch (the global fetch since SDK 53) rejects React Native's
		// {uri, type, name} parts; a File is read through its bytes instead.
		formData.append("file", new ExpoFile(photo.uri) as any, `ticket-${index}.${extension}`);
	});

	return cleanTicket(await request("/tickets/scan", { method: "POST", token, form: formData, schema: TicketSchema }));
}

export async function getTickets(token: string): Promise<TicketResponse[]> {
	const tickets = await request("/tickets", { token, schema: TicketListSchema });
	return tickets.map(cleanTicket);
}

export async function getTicket(token: string, id: number): Promise<TicketResponse> {
	return cleanTicket(await request(`/tickets/${id}`, { token, schema: TicketSchema }));
}

export async function updateTicket(
	token: string,
	id: number,
	data: UpdateTicketData,
): Promise<TicketResponse> {
	return cleanTicket(await request(`/tickets/${id}`, { method: "PUT", token, json: data, schema: TicketSchema }));
}

export function deleteTicket(token: string, id: number): Promise<void> {
	return requestVoid(`/tickets/${id}`, { method: "DELETE", token });
}

export function getSavingsReport(token: string, from?: string, to?: string): Promise<SavingsReportResponse> {
	return request("/savings/report", { token, query: { from, to }, schema: SavingsReportSchema });
}
