import { API_BASE_URL } from "../config";

export type PointsReason =
	| "REFERRAL_SIGNUP" // vos, al registrarte con un código (inmediato)
	| "REFERRAL_ACTIVATED" // quien invitó, cuando vos escaneaste tu primer ticket
	| "REFERRAL_RETAINED" // quien invitó, si vos seguís activo 30 días después
	| "REDEEM";

export type PointsTransactionResponse = {
	id: number;
	reason: PointsReason;
	description: string;
	points: number; // positivo suma, negativo resta (p. ej. un canje)
	createdAt: string;
};

export type PointsBalanceResponse = {
	balance: number;
	referralCode: string;
};

async function parseApiError(res: Response): Promise<string> {
	try {
		const json = await res.json();
		if (json.message && typeof json.message === "string") {
			return json.message;
		}
		return `Error del servidor (${res.status})`;
	} catch {
		return `Error del servidor (${res.status})`;
	}
}

export async function getPointsBalance(
	token: string,
): Promise<PointsBalanceResponse> {
	const res = await fetch(`${API_BASE_URL}/points/me`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	});

	if (!res.ok) throw new Error(await parseApiError(res));
	return res.json() as Promise<PointsBalanceResponse>;
}

export async function getPointsHistory(
	token: string,
): Promise<PointsTransactionResponse[]> {
	const res = await fetch(`${API_BASE_URL}/points/history`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	});

	if (!res.ok) throw new Error(await parseApiError(res));
	return res.json() as Promise<PointsTransactionResponse[]>;
}

/** Canjea una recompensa del catálogo local (src/data/rewards.ts) por su id.
 * El backend es la fuente de verdad del saldo: si no alcanza, devuelve 409. */
export async function redeemReward(
	token: string,
	rewardId: string,
	points: number,
): Promise<PointsBalanceResponse> {
	const res = await fetch(`${API_BASE_URL}/points/redeem`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ rewardId, points }),
	});

	if (!res.ok) throw new Error(await parseApiError(res));
	return res.json() as Promise<PointsBalanceResponse>;
}
