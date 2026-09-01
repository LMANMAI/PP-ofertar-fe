import * as SecureStore from "expo-secure-store";

const KEY = "ofertar_announced_tickets";
/** Enough to cover any realistic backlog while staying far inside the value
 * size limit SecureStore enforces on Android. */
const MAX_REMEMBERED = 50;

/**
 * Tickets whose "¿olvidaste comprar algo?" notice the user has already seen.
 *
 * Persisted rather than kept in memory because the notice exists precisely for
 * the case where processing finishes while the app is closed: on the next
 * launch there is no in-memory state left, and the ticket has to be announced
 * once — but only once, or opening it again would nag every time.
 */
async function read(): Promise<number[]> {
	try {
		const raw = await SecureStore.getItemAsync(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : [];
	} catch {
		// A corrupt or unreadable store must not break opening a ticket; the
		// worst case is showing the notice one extra time.
		return [];
	}
}

export async function hasBeenAnnounced(ticketId: number): Promise<boolean> {
	return (await read()).includes(ticketId);
}

export async function markAnnounced(ticketId: number): Promise<void> {
	try {
		const current = await read();
		if (current.includes(ticketId)) return;
		const next = [ticketId, ...current].slice(0, MAX_REMEMBERED);
		await SecureStore.setItemAsync(KEY, JSON.stringify(next));
	} catch {
		// Same reasoning: failing to remember is not worth surfacing.
	}
}
