import { create } from "zustand";
import {
	addShoppingListItem,
	clearCheckedShoppingListItems,
	followProduct,
	getFollowedEans,
	getShoppingList,
	removeShoppingListItem,
	unfollowProduct,
	updateShoppingListItem,
	type SavedProductInput,
	type ShoppingList,
	type ShoppingListItem,
} from "../services/savedProductsApi";

export type ListStatus = "idle" | "loading" | "ready" | "error";

/**
 * La lista de compras y los códigos de los productos seguidos. Viven acá y no en una pantalla
 * porque el escáner los necesita para dibujar "En tu lista" y "Siguiendo" sobre el producto que
 * acaba de leer, y las pantallas que los cambian son otras.
 *
 * El backend es la fuente de verdad: cada cambio de la lista devuelve la lista entera y eso es lo
 * que queda guardado. Tildar, cambiar la cantidad y sacar se ven al instante y se deshacen si el
 * backend los rechaza.
 */
type SavedProductsState = {
	/** null hasta que se pudo leer. */
	list: ShoppingList | null;
	listStatus: ListStatus;
	/** null hasta que se pudo leer (ver isFollowing). */
	followedEans: string[] | null;
	/** Token para el que se pidieron los datos; descarta respuestas de una sesión anterior. */
	loadedFor: string | null;

	/** Trae la lista. Si falla y ya había una, la deja y no marca error: sigue siendo la última conocida. */
	loadList: (token: string) => Promise<void>;
	/** Trae los códigos seguidos. Si falla quedan como estaban. */
	loadFollowedEans: (token: string) => Promise<void>;

	/** Los cambios lanzan el error del backend si fallan, ya deshechos. */
	addToList: (token: string, product: SavedProductInput) => Promise<void>;
	setChecked: (token: string, itemId: number, checked: boolean) => Promise<void>;
	setQuantity: (token: string, itemId: number, quantity: number) => Promise<void>;
	removeFromList: (token: string, itemId: number) => Promise<void>;
	clearChecked: (token: string) => Promise<void>;
	follow: (token: string, product: SavedProductInput) => Promise<void>;
	unfollow: (token: string, ean: string) => Promise<void>;

	reset: () => void;
};

const vacio = {
	list: null as ShoppingList | null,
	listStatus: "idle" as ListStatus,
	followedEans: null as string[] | null,
	loadedFor: null as string | null,
};

/** Está en la lista y todavía falta comprarlo. Uno ya tildado se puede volver a agregar. */
export function isOnShoppingList(list: ShoppingList | null, ean: string): boolean {
	return list?.items.some((item) => item.ean === ean && !item.checked) ?? false;
}

/** Cuántos faltan comprar. */
export function pendingCount(list: ShoppingList | null): number {
	return list?.items.filter((item) => !item.checked).length ?? 0;
}

/**
 * Mientras los códigos seguidos no se pudieron leer cuenta como "no lo seguís": el botón ofrece
 * seguir, y seguir uno que ya se seguía no es un error en el backend.
 */
export function isFollowing(followedEans: string[] | null, ean: string): boolean {
	return followedEans?.includes(ean) ?? false;
}

export const useSavedProductsStore = create<SavedProductsState>()((set, get) => {
	/**
	 * Cada cambio de la lista pisa el estado con lo que devuelve el backend. Con dos cambios
	 * seguidos (dos toques al "+"), la respuesta del primero llega cuando la pantalla ya muestra
	 * el segundo: aplicarla la haría retroceder un instante. Solo se aplica la del último.
	 */
	let lastChange = 0;

	async function change(
		token: string,
		optimistic: ((list: ShoppingList) => ShoppingList) | null,
		call: () => Promise<ShoppingList>,
	): Promise<void> {
		const turn = ++lastChange;
		const before = get().list;
		if (optimistic && before) set({ list: optimistic(before) });
		try {
			const list = await call();
			if (turn === lastChange && get().loadedFor === token) set({ list, listStatus: "ready" });
		} catch (error) {
			// Solo se deshace si nada cambió después: si hubo otro cambio, su respuesta trae la
			// lista real y pisar con `before` borraría ese otro.
			if (turn === lastChange && get().loadedFor === token) set({ list: before });
			throw error;
		}
	}

	const patchItem = (itemId: number, patch: Partial<ShoppingListItem>) => (list: ShoppingList) => ({
		...list,
		items: list.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
	});

	/** Los datos son de una cuenta: al cambiar el token se empieza de cero. */
	function bind(token: string) {
		if (get().loadedFor !== token) set({ ...vacio, loadedFor: token });
	}

	return {
		...vacio,

		loadList: async (token) => {
			bind(token);
			const turn = lastChange;
			if (!get().list) set({ listStatus: "loading" });
			try {
				const list = await getShoppingList(token);
				// Un cambio hecho mientras se leía es más nuevo que esta respuesta.
				if (get().loadedFor === token && turn === lastChange) set({ list, listStatus: "ready" });
			} catch {
				if (get().loadedFor === token && !get().list) set({ listStatus: "error" });
			}
		},

		loadFollowedEans: async (token) => {
			bind(token);
			try {
				const eans = await getFollowedEans(token);
				if (get().loadedFor === token) set({ followedEans: eans });
			} catch {
				// Se reintenta la próxima vez que se abre el escáner; mientras tanto ver isFollowing.
			}
		},

		addToList: (token, product) => {
			bind(token);
			return change(token, null, () => addShoppingListItem(token, product));
		},

		setChecked: (token, itemId, checked) =>
			change(token, patchItem(itemId, { checked }), () => updateShoppingListItem(token, itemId, { checked })),

		setQuantity: (token, itemId, quantity) =>
			change(token, patchItem(itemId, { quantity }), () => updateShoppingListItem(token, itemId, { quantity })),

		removeFromList: (token, itemId) =>
			change(
				token,
				(list) => ({ ...list, items: list.items.filter((item) => item.id !== itemId) }),
				() => removeShoppingListItem(token, itemId),
			),

		clearChecked: (token) =>
			change(
				token,
				(list) => ({ ...list, items: list.items.filter((item) => !item.checked) }),
				() => clearCheckedShoppingListItems(token),
			),

		follow: async (token, product) => {
			bind(token);
			await followProduct(token, product);
			if (get().loadedFor !== token) return;
			const current = get().followedEans ?? [];
			if (!current.includes(product.ean)) set({ followedEans: [product.ean, ...current] });
		},

		unfollow: async (token, ean) => {
			bind(token);
			await unfollowProduct(token, ean);
			if (get().loadedFor !== token) return;
			const current = get().followedEans;
			if (current) set({ followedEans: current.filter((e) => e !== ean) });
		},

		reset: () => {
			lastChange++;
			set(vacio);
		},
	};
});
