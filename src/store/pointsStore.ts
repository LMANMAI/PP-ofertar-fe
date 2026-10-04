import { create } from "zustand";
import type { PointsHistoryEntry } from "../screens/PointsHistoryScreen";
import { getPointsBalance, getPointsHistory, redeemReward, type PointsTransactionResponse } from "../services/pointsApi";

/**
 * Saldo e historial de puntos. El backend es la fuente de verdad (ver PRODUCT.md: antes eran
 * solo del frontend y se perdían al cerrar la app); este store es un espejo de /points/me y
 * /points/history, no un contador que la app lleve por su cuenta.
 */
type PointsState = {
	balance: number;
	history: PointsHistoryEntry[];
	redeeming: boolean;
	/** Saldo que devolvió el último canje, para la pantalla de éxito. */
	lastRedeemBalance: number;
	/** Trae saldo e historial. Si el backend no responde deja lo que hay: no rompe el resto de la app. */
	refresh: (token: string) => Promise<void>;
	/**
	 * Canjea una recompensa. El backend valida que alcancen los puntos (409 si no) y devuelve el
	 * saldo actualizado, en vez de restar optimista del lado del cliente. Devuelve false si ya hay
	 * un canje en curso; lanza el error del backend si falla.
	 */
	redeem: (token: string, rewardId: string, points: number) => Promise<boolean>;
	reset: () => void;
};

const vacio = { balance: 0, history: [] as PointsHistoryEntry[], redeeming: false, lastRedeemBalance: 0 };

/** Un movimiento del backend, listo para la pantalla de historial. */
export function historyEntryFromTx(tx: PointsTransactionResponse): PointsHistoryEntry {
	return {
		id: String(tx.id),
		icon:
			tx.reason === "REDEEM"
				? "gift-outline"
				: tx.reason === "REFERRAL_ACTIVATED"
					? "people"
					: tx.reason === "REFERRAL_RETAINED"
						? "heart-outline"
						: "people-outline",
		title: tx.description,
		date: new Date(tx.createdAt).toLocaleDateString("es-AR", {
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit",
		}),
		pts: tx.points,
	};
}

export const usePointsStore = create<PointsState>()((set, get) => ({
	...vacio,

	refresh: async (token) => {
		try {
			const [balance, history] = await Promise.all([getPointsBalance(token), getPointsHistory(token)]);
			set({ balance: balance.balance, history: history.map(historyEntryFromTx) });
		} catch {
			// Si el backend de puntos no responde, el usuario ve lo último que se tenía (0 y un
			// historial vacío al inicio) hasta poder reintentar, por ejemplo al volver a Puntos.
		}
	},

	redeem: async (token, rewardId, points) => {
		if (get().redeeming) return false;
		set({ redeeming: true });
		try {
			const result = await redeemReward(token, rewardId, points);
			set({ balance: result.balance, lastRedeemBalance: result.balance });
			void get().refresh(token);
			return true;
		} finally {
			set({ redeeming: false });
		}
	},

	reset: () => set(vacio),
}));
