import type { components } from "../api/schema";
import { request } from "../api/client";
import { PointsBalanceSchema, PointsHistorySchema } from "../api/schemas";

export type PointsTransactionResponse = components["schemas"]["PointsHistoryEntryResponse"];

/** REFERRAL_SIGNUP: vos, al registrarte con un código (inmediato). REFERRAL_ACTIVATED: quien
 * invitó, cuando vos escaneaste tu primer ticket. REFERRAL_RETAINED: quien invitó, si vos
 * seguís activo 30 días después. REDEEM: un canje. */
export type PointsReason = PointsTransactionResponse["reason"];

export type PointsBalanceResponse = components["schemas"]["PointsBalanceResponse"];

export function getPointsBalance(token: string): Promise<PointsBalanceResponse> {
	return request("/points/me", { token, schema: PointsBalanceSchema });
}

/** `points` positivo suma, negativo resta (p. ej. un canje). */
export function getPointsHistory(token: string): Promise<PointsTransactionResponse[]> {
	return request("/points/history", { token, schema: PointsHistorySchema });
}

/** Canjea una recompensa del catálogo local (src/data/rewards.ts) por su id.
 * El backend es la fuente de verdad del saldo: si no alcanza, devuelve 409. */
export function redeemReward(token: string, rewardId: string, points: number): Promise<PointsBalanceResponse> {
	return request("/points/redeem", { method: "POST", token, json: { rewardId, points }, schema: PointsBalanceSchema });
}
