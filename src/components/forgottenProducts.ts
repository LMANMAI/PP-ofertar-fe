import type { RecurringProduct } from "../services";

/** Products bought on fewer separate trips than this are one-offs, not part of
 * the recurring shop — asking about them would be noise. Also the threshold
 * SmartShoppingListScreen filters its own list against, imported rather than
 * redeclared so the two can't drift apart. */
export const MIN_TRIPS_TO_BE_HABITUAL = 2;
export const MAX_FORGOTTEN_SHOWN = 5;

/**
 * Given every recurring product measured against one ticket, the ones the user
 * habitually buys and this ticket does not contain.
 *
 * Plain module, not the .tsx next to it: this is the rule that decides whether
 * to interrupt the user, and it should be testable without pulling in React
 * Native.
 */
export function forgottenIn(products: RecurringProduct[]): RecurringProduct[] {
	return products
		.filter((p) => !p.inReferenceTicket && p.ticketCount >= MIN_TRIPS_TO_BE_HABITUAL)
		.slice(0, MAX_FORGOTTEN_SHOWN);
}
