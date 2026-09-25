import type { RecurringProduct } from "../services";

/** Products bought on fewer separate trips than this are one-offs, not part of
 * the recurring shop — asking about them would be noise. Also the threshold
 * "Tu compra habitual" filters its own list against, imported rather than
 * redeclared so the two can't drift apart. */
export const MIN_TRIPS_TO_BE_HABITUAL = 2;
export const MAX_FORGOTTEN_SHOWN = 5;

/** Every product the user habitually buys, in the order it arrived. */
export function habitualProducts(products: RecurringProduct[]): RecurringProduct[] {
	return products.filter((p) => p.ticketCount >= MIN_TRIPS_TO_BE_HABITUAL);
}

/**
 * The habitual products the reference ticket does not contain, all of them.
 *
 * With fewer than three tickets this is always empty, by construction: a
 * product needs two trips to be habitual, so with two tickets it is in both,
 * the reference among them. Screens that say so should not read it as "nothing
 * is missing".
 */
export function missingHabitual(products: RecurringProduct[]): RecurringProduct[] {
	return habitualProducts(products).filter((p) => !p.inReferenceTicket);
}

/**
 * Given every recurring product measured against one ticket, the ones the user
 * habitually buys and this ticket does not contain — capped, because it is what
 * interrupts the user right after a scan.
 *
 * Plain module, not the .tsx next to it: this is the rule that decides whether
 * to interrupt the user, and it should be testable without pulling in React
 * Native.
 */
export function forgottenIn(products: RecurringProduct[]): RecurringProduct[] {
	return missingHabitual(products).slice(0, MAX_FORGOTTEN_SHOWN);
}
