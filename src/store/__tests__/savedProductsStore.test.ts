import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	addShoppingListItem,
	followProduct,
	getFollowedEans,
	getShoppingList,
	removeShoppingListItem,
	unfollowProduct,
	updateShoppingListItem,
	type ShoppingList,
	type ShoppingListItem,
} from "../../services/savedProductsApi";
import { isFollowing, isOnShoppingList, pendingCount, resetAllStores, useSavedProductsStore } from "..";

vi.mock("../../services/savedProductsApi", () => ({
	addShoppingListItem: vi.fn(),
	clearCheckedShoppingListItems: vi.fn(),
	followProduct: vi.fn(),
	getFollowedEans: vi.fn(),
	getShoppingList: vi.fn(),
	removeShoppingListItem: vi.fn(),
	unfollowProduct: vi.fn(),
	updateShoppingListItem: vi.fn(),
}));

const mockGetList = vi.mocked(getShoppingList);
const mockAdd = vi.mocked(addShoppingListItem);
const mockUpdate = vi.mocked(updateShoppingListItem);
const mockRemove = vi.mocked(removeShoppingListItem);
const mockEans = vi.mocked(getFollowedEans);
const mockFollow = vi.mocked(followProduct);
const mockUnfollow = vi.mocked(unfollowProduct);

const item = (id: number, ean: string, over: Partial<ShoppingListItem> = {}): ShoppingListItem => ({
	id,
	ean,
	description: `Producto ${id}`,
	brand: null,
	imageUrl: null,
	quantity: 1,
	checked: false,
	addedAt: "2026-10-07T20:00:00",
	...over,
});
const lista = (...items: ShoppingListItem[]): ShoppingList => ({ name: "Mi lista", items });
const gaseosa = { ean: "7790895000997", description: "Gaseosa", brand: null };

/** Una promesa que se resuelve o rechaza a mano, para ordenar respuestas del backend. */
function pendiente<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

const store = () => useSavedProductsStore.getState();

beforeEach(() => {
	resetAllStores();
	vi.clearAllMocks();
});

describe("lo que pregunta el escáner", () => {
	it("está en la lista solo si falta comprarlo: uno tildado se puede volver a agregar", () => {
		const l = lista(item(1, "111"), item(2, "222", { checked: true }));
		expect(isOnShoppingList(l, "111")).toBe(true);
		expect(isOnShoppingList(l, "222")).toBe(false);
		expect(isOnShoppingList(l, "333")).toBe(false);
		expect(isOnShoppingList(null, "111")).toBe(false);
		expect(pendingCount(l)).toBe(1);
	});

	it("sin los códigos seguidos leídos, cuenta como que no lo seguís", () => {
		expect(isFollowing(null, "111")).toBe(false);
		expect(isFollowing(["111"], "111")).toBe(true);
	});
});

describe("leer la lista", () => {
	it("la guarda y queda lista", async () => {
		mockGetList.mockResolvedValue(lista(item(1, "111")));
		await store().loadList("t1");
		expect(store().listStatus).toBe("ready");
		expect(store().list?.items).toHaveLength(1);
	});

	it("si falla sin tener nada marca error; si ya había una lista la deja", async () => {
		mockGetList.mockRejectedValueOnce(new Error("sin red"));
		await store().loadList("t1");
		expect(store().listStatus).toBe("error");

		mockGetList.mockResolvedValueOnce(lista(item(1, "111")));
		await store().loadList("t1");
		mockGetList.mockRejectedValueOnce(new Error("sin red"));
		await store().loadList("t1");
		expect(store().listStatus).toBe("ready");
		expect(store().list?.items).toHaveLength(1);
	});

	it("con otra cuenta empieza de cero y descarta la respuesta de la anterior", async () => {
		const vieja = pendiente<ShoppingList>();
		mockGetList.mockReturnValueOnce(vieja.promise);
		const lectura = store().loadList("t1");

		mockGetList.mockResolvedValueOnce(lista());
		await store().loadList("t2");
		vieja.resolve(lista(item(1, "111")));
		await lectura;

		expect(store().loadedFor).toBe("t2");
		expect(store().list?.items).toEqual([]);
	});
});

describe("cambiar la lista", () => {
	beforeEach(async () => {
		mockGetList.mockResolvedValue(lista(item(1, "111"), item(2, "222")));
		await store().loadList("t1");
	});

	it("agregar deja lo que devuelve el backend", async () => {
		mockAdd.mockResolvedValue(lista(item(1, "111"), item(2, "222"), item(3, gaseosa.ean)));
		await store().addToList("t1", gaseosa);
		expect(mockAdd).toHaveBeenCalledWith("t1", gaseosa);
		expect(isOnShoppingList(store().list, gaseosa.ean)).toBe(true);
	});

	it("tildar se ve al instante, antes de que conteste el backend", async () => {
		const respuesta = pendiente<ShoppingList>();
		mockUpdate.mockReturnValue(respuesta.promise);

		const cambio = store().setChecked("t1", 1, true);
		expect(store().list?.items[0].checked).toBe(true);

		respuesta.resolve(lista(item(1, "111", { checked: true }), item(2, "222")));
		await cambio;
		expect(mockUpdate).toHaveBeenCalledWith("t1", 1, { checked: true });
		expect(store().list?.items[0].checked).toBe(true);
	});

	it("si el backend lo rechaza se deshace y el error llega a quien lo pidió", async () => {
		mockUpdate.mockRejectedValue(new Error("no"));
		await expect(store().setQuantity("t1", 1, 5)).rejects.toThrow("no");
		expect(store().list?.items[0].quantity).toBe(1);
	});

	it("dos toques seguidos al +: la respuesta del primero no hace retroceder la cantidad", async () => {
		const primera = pendiente<ShoppingList>();
		const segunda = pendiente<ShoppingList>();
		mockUpdate.mockReturnValueOnce(primera.promise).mockReturnValueOnce(segunda.promise);

		const a = store().setQuantity("t1", 1, 2);
		const b = store().setQuantity("t1", 1, 3);
		expect(store().list?.items[0].quantity).toBe(3);

		primera.resolve(lista(item(1, "111", { quantity: 2 }), item(2, "222")));
		await a;
		expect(store().list?.items[0].quantity).toBe(3);

		segunda.resolve(lista(item(1, "111", { quantity: 3 }), item(2, "222")));
		await b;
		expect(store().list?.items[0].quantity).toBe(3);
	});

	it("un cambio viejo que falla no pisa uno más nuevo", async () => {
		const primera = pendiente<ShoppingList>();
		mockUpdate.mockReturnValueOnce(primera.promise);
		mockRemove.mockResolvedValue(lista(item(1, "111")));

		const tilde = store().setChecked("t1", 1, true);
		await store().removeFromList("t1", 2);
		primera.reject(new Error("tarde"));
		await expect(tilde).rejects.toThrow("tarde");

		expect(store().list?.items.map((i) => i.id)).toEqual([1]);
	});

	it("sacar un producto lo quita al instante", async () => {
		const respuesta = pendiente<ShoppingList>();
		mockRemove.mockReturnValue(respuesta.promise);
		const cambio = store().removeFromList("t1", 1);
		expect(store().list?.items.map((i) => i.id)).toEqual([2]);
		respuesta.resolve(lista(item(2, "222")));
		await cambio;
	});
});

describe("seguir productos", () => {
	it("leer los códigos los deja disponibles; si falla quedan sin saberse", async () => {
		mockEans.mockRejectedValueOnce(new Error("sin red"));
		await store().loadFollowedEans("t1");
		expect(store().followedEans).toBeNull();

		mockEans.mockResolvedValueOnce(["111"]);
		await store().loadFollowedEans("t1");
		expect(store().followedEans).toEqual(["111"]);
	});

	it("seguir y dejar de seguir actualizan los códigos recién cuando el backend confirma", async () => {
		mockEans.mockResolvedValue(["111"]);
		await store().loadFollowedEans("t1");

		mockFollow.mockResolvedValue();
		await store().follow("t1", gaseosa);
		expect(isFollowing(store().followedEans, gaseosa.ean)).toBe(true);
		expect(store().followedEans).toHaveLength(2);

		mockUnfollow.mockResolvedValue();
		await store().unfollow("t1", gaseosa.ean);
		expect(store().followedEans).toEqual(["111"]);
	});

	it("si seguir falla no queda marcado como seguido", async () => {
		mockFollow.mockRejectedValue(new Error("Ya seguís 30 productos."));
		await expect(store().follow("t1", gaseosa)).rejects.toThrow("30");
		expect(isFollowing(store().followedEans, gaseosa.ean)).toBe(false);
	});
});

describe("cerrar sesión", () => {
	it("resetAllStores borra la lista y los seguidos de la cuenta", async () => {
		mockGetList.mockResolvedValue(lista(item(1, "111")));
		mockEans.mockResolvedValue(["111"]);
		await store().loadList("t1");
		await store().loadFollowedEans("t1");

		resetAllStores();

		expect(store().list).toBeNull();
		expect(store().followedEans).toBeNull();
		expect(store().listStatus).toBe("idle");
		expect(store().loadedFor).toBeNull();
	});
});
