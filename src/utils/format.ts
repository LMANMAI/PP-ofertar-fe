/** Whole-peso amounts (list cards, summaries) — no decimals. */
export function formatCurrency(value: number | null | undefined): string {
	if (value == null) return "$0";
	return `$${Math.round(value).toLocaleString("es-AR")}`;
}

/** Exact amounts (ticket/report detail) — always shows centavos. */
export function formatCurrencyExact(value: number | null | undefined): string {
	if (value == null) return "$0,00";
	return `$${value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// A whole number is units; a fraction only ever comes from a line the
// supermarket weighed, so it reads as kilos rather than "0,52 u".
export function formatQuantity(value: number | null | undefined): string {
	if (value == null) return "1 u";
	if (Number.isInteger(value)) return `${value} u`;
	return `${value.toLocaleString("es-AR", { maximumFractionDigits: 3 })} kg`;
}

/** "3 de septiembre" (optionally "de 2026") — used for offer/promo validity
 * windows, which are null-safe since not every offer carries an end date. */
export function formatLongDate(iso: string | null, opts?: { year?: boolean }): string | null {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString("es-AR", {
		day: "numeric",
		month: "long",
		...(opts?.year ? { year: "numeric" as const } : {}),
	});
}

/** "3 sept, 14:32" — when a ticket was scanned, not necessarily when the
 * purchase happened (the ticket carries no separate emission date). */
export function formatTicketTimestamp(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleDateString("es-AR", {
		day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
	});
}
