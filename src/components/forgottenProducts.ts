import type { RecurringProduct } from "../services";

/** Products bought on fewer separate trips than this are one-offs, not part of
 * the recurring shop — asking about them would be noise. Also the threshold
 * "Tu compra habitual" filters its own list against, imported rather than
 * redeclared so the two can't drift apart. */
export const MIN_TRIPS_TO_BE_HABITUAL = 2;
export const MAX_FORGOTTEN_SHOWN = 5;

/** La regla de Consumo Inteligente dicha en pantalla. Los valores viven en el
 * backend (`recurring.window-days` y `recurring.min-tickets`): si cambian allá,
 * este texto cambia con ellos. */
export const RECURRING_RULE_TEXT =
	"Productos que compraste en 2 o más tickets en los últimos 3 meses. Se actualiza con cada ticket.";
export const RECURRING_EMPTY_HINT =
	"Cuando compres un producto en 2 tickets dentro de 3 meses, aparece acá. Una compra aislada no cuenta.";

/** Bought on enough separate trips to be recurring, whatever else is true of it. */
export function isRecurring(product: RecurringProduct): boolean {
	return product.ticketCount >= MIN_TRIPS_TO_BE_HABITUAL;
}

/** The user's habitual shop, in the order it arrived: what the tickets show they
 * buy, plus what they added from the barcode scanner. It is one list. */
export function habitualProducts(products: RecurringProduct[]): RecurringProduct[] {
	return products.filter((p) => isRecurring(p) || p.addedToHabitual);
}

/**
 * The habitual products the reference ticket does not contain, all of them.
 *
 * Without added products and with fewer than three tickets this is always
 * empty, by construction: a product needs two trips to be habitual, so with two
 * tickets it is in both, the reference among them. Screens that say so should
 * not read it as "nothing is missing".
 */
export function missingHabitual(products: RecurringProduct[]): RecurringProduct[] {
	return habitualProducts(products).filter((p) => !p.inReferenceTicket);
}

/**
 * What this ticket does not contain of the user's habitual shop. Added products
 * go first, because the user asked for those by name.
 *
 * Not capped: the sheet shows the first MAX_FORGOTTEN_SHOWN and says how many
 * more there are.
 *
 * Plain module, not the .tsx next to it: this is the rule that decides whether
 * to interrupt the user, and it should be testable without pulling in React
 * Native.
 */
export function forgottenIn(products: RecurringProduct[]): RecurringProduct[] {
	const missing = missingHabitual(products);
	return [...missing.filter((p) => p.addedToHabitual), ...missing.filter((p) => !p.addedToHabitual)];
}
