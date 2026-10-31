import { create } from "zustand";
import { followProduct, getFollowedEans, unfollowProduct, type FollowProductInput } from "../services/followedProductsApi";
import { includesEan, sameEan } from "../utils/ean";

/**
 * Los códigos de los productos seguidos. Viven acá y no en una pantalla porque el escáner los
 * necesita para dibujar "Siguiendo" sobre el producto que acaba de leer, y la pantalla que deja
 * de seguirlos es otra.
 *
 * Están tal como los guardó el backend (13 o 14 dígitos), así que se comparan normalizados:
 * el backend también trata como el mismo producto un GTIN-14 y su EAN-13.
 */
type FollowedProductsState = {
	/** null hasta que se pudo leer la lista entera (ver isFollowing). Nunca una lista a medias. */
	followedEans: string[] | null;
	/** Token para el que se pidieron los datos; descarta respuestas de una sesión anterior. */
	loadedFor: string | null;

	/** Trae los códigos seguidos. Si falla quedan como estaban. */
	loadFollowedEans: (token: string) => Promise<void>;

	/** Lanzan el error del backend si fallan; los códigos cambian recién cuando el backend confirma. */
	follow: (token: string, product: FollowProductInput) => Promise<void>;
	unfollow: (token: string, ean: string) => Promise<void>;

	reset: () => void;
};

const vacio = {
	followedEans: null as string[] | null,
	loadedFor: null as string | null,
};

/**
 * Mientras los códigos seguidos no se pudieron leer cuenta como "no lo seguís": el botón ofrece
 * seguir, y seguir uno que ya se seguía no es un error en el backend.
 */
export function isFollowing(followedEans: string[] | null, ean: string): boolean {
	return followedEans != null && includesEan(followedEans, ean);
}

export const useFollowedProductsStore = create<FollowedProductsState>()((set, get) => {
	/** Los datos son de una cuenta: al cambiar el token se empieza de cero. */
	function bind(token: string) {
		if (get().loadedFor !== token) set({ ...vacio, loadedFor: token });
	}

	/** Solo vale la respuesta de la última lectura: una anterior puede llegar después y no tener lo último que se siguió. */
	let lecturas = 0;

	async function load(token: string) {
		bind(token);
		const lectura = ++lecturas;
		try {
			const eans = await getFollowedEans(token);
			if (lectura === lecturas && get().loadedFor === token) set({ followedEans: eans });
		} catch {
			// Se reintenta en la próxima sesión o al seguir uno; mientras tanto ver isFollowing.
		}
	}

	return {
		...vacio,

		loadFollowedEans: load,

		follow: async (token, product) => {
			bind(token);
			await followProduct(token, product);
			if (get().loadedFor !== token) return;
			const current = get().followedEans;
			// Sin la lista leída, guardar solo este haría pasar por no seguidos a todos los demás
			// hasta la próxima sesión: se vuelve a pedir, que ahora ya lo incluye.
			if (current == null) return load(token);
			if (!isFollowing(current, product.ean)) set({ followedEans: [product.ean, ...current] });
		},

		unfollow: async (token, ean) => {
			bind(token);
			await unfollowProduct(token, ean);
			if (get().loadedFor !== token) return;
			const current = get().followedEans;
			if (current == null) return load(token);
			set({ followedEans: current.filter((e) => !sameEan(e, ean)) });
		},

		reset: () => set(vacio),
	};
});
