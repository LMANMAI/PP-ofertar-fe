import { create } from "zustand";
import { addHabitualProduct, getHabitualEans, removeHabitualProduct } from "../services/habitualProductsApi";
import type { FollowProductInput } from "../services/followedProductsApi";
import { includesEan, sameEan } from "../utils/ean";

/**
 * Los códigos que el usuario sumó a su compra habitual. Viven acá y no en una pantalla porque el
 * escáner los necesita para marcar el producto que acaba de leer, y quien los saca es otra pantalla.
 *
 * Están tal como los guardó el backend (13 o 14 dígitos), así que se comparan normalizados.
 */
type HabitualProductsState = {
	/** null hasta que se pudieron leer todos (ver isInHabitual). Nunca una lista a medias. */
	eans: string[] | null;
	/** Token para el que se pidieron los datos; descarta respuestas de una sesión anterior. */
	loadedFor: string | null;

	/** Trae los códigos. Si falla quedan como estaban. */
	loadEans: (token: string) => Promise<void>;

	/** Lanzan el error del backend si fallan; los códigos cambian recién cuando el backend confirma. */
	add: (token: string, product: FollowProductInput) => Promise<void>;
	remove: (token: string, ean: string) => Promise<void>;

	reset: () => void;
};

const vacio = {
	eans: null as string[] | null,
	loadedFor: null as string | null,
};

/** Mientras no se pudo leer cuenta como "no está": sumar uno que ya estaba no es un error. */
export function isInHabitual(eans: string[] | null, ean: string): boolean {
	return eans != null && includesEan(eans, ean);
}

export const useHabitualProductsStore = create<HabitualProductsState>()((set, get) => {
	/** Los datos son de una cuenta: al cambiar el token se empieza de cero. */
	function bind(token: string) {
		if (get().loadedFor !== token) set({ ...vacio, loadedFor: token });
	}

	/** Solo vale la respuesta de la última lectura: una anterior puede llegar después y no tener lo último. */
	let lecturas = 0;

	async function load(token: string) {
		bind(token);
		const lectura = ++lecturas;
		try {
			const eans = await getHabitualEans(token);
			if (lectura === lecturas && get().loadedFor === token) set({ eans });
		} catch {
			// Se reintenta en la próxima sesión o al sumar uno; mientras tanto ver isInHabitual.
		}
	}

	return {
		...vacio,

		loadEans: load,

		add: async (token, product) => {
			bind(token);
			await addHabitualProduct(token, product);
			if (get().loadedFor !== token) return;
			const current = get().eans;
			// Sin los códigos leídos, guardar solo este haría pasar a los demás por no sumados.
			if (current == null) return load(token);
			if (!isInHabitual(current, product.ean)) set({ eans: [product.ean, ...current] });
		},

		remove: async (token, ean) => {
			bind(token);
			await removeHabitualProduct(token, ean);
			if (get().loadedFor !== token) return;
			const current = get().eans;
			if (current == null) return load(token);
			set({ eans: current.filter((e) => !sameEan(e, ean)) });
		},

		reset: () => set(vacio),
	};
});
