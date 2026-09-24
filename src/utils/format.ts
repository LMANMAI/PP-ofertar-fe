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

// A date-only value ("2026-09-24") is a calendar day, not an instant. `new Date`
// reads it as midnight UTC, which in Argentina is the previous evening: the day
// was shown one early and an offer "until the 24th" counted as over all day.
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDay(iso: string): Date {
	const m = DATE_ONLY.exec(iso);
	return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
}

/** True once the end date has passed. A date-only end holds through that whole
 * day; a full timestamp ends at that instant. False when there is no date. */
export function hasEnded(iso: string | null): boolean {
	if (!iso) return false;
	const d = parseDay(iso);
	if (Number.isNaN(d.getTime())) return false;
	const end = DATE_ONLY.test(iso) ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) : d;
	return end.getTime() <= Date.now();
}

/** "3 de septiembre" (optionally "de 2026") — used for offer/promo validity
 * windows, which are null-safe since not every offer carries an end date. */
export function formatLongDate(iso: string | null, opts?: { year?: boolean }): string | null {
	if (!iso) return null;
	const d = parseDay(iso);
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString("es-AR", {
		day: "numeric",
		month: "long",
		...(opts?.year ? { year: "numeric" as const } : {}),
	});
}

/** "3 sept, 14:32" — when a ticket was scanned, not necessarily when the
 * purchase happened (the ticket carries no separate emission date). The year
 * is added only for a previous year, so a January ticket seen in December is
 * not ambiguous. */
export function formatTicketTimestamp(iso: string): string {
	const d = new Date(iso);
	const otherYear = d.getFullYear() !== new Date().getFullYear();
	return d.toLocaleDateString("es-AR", {
		day: "numeric", month: "short", ...(otherYear ? { year: "numeric" as const } : {}), hour: "2-digit", minute: "2-digit",
	});
}

/** The "YYYY-MM" key the savings report takes as `from`/`to`. Built from the
 * device's own calendar, which for this app is Argentina — asking the backend
 * for a month is the only thing that makes the "AHORRO DEL MES" card actually
 * about the month. */
export function yyyyMM(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	return `${year}-${month}`;
}
