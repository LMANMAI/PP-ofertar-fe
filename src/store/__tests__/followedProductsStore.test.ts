import { beforeEach, describe, expect, it, vi } from "vitest";
import { followProduct, getFollowedEans, unfollowProduct } from "../../services/followedProductsApi";
import { isFollowing, resetAllStores, useFollowedProductsStore } from "..";

vi.mock("../../services/followedProductsApi", () => ({
	followProduct: vi.fn(),
	getFollowedEans: vi.fn(),
	unfollowProduct: vi.fn(),
}));

const mockEans = vi.mocked(getFollowedEans);
const mockFollow = vi.mocked(followProduct);
const mockUnfollow = vi.mocked(unfollowProduct);

const gaseosa = { ean: "7790895000997", description: "Gaseosa", brand: null };

/** Una promesa que se resuelve a mano, para ordenar respuestas del backend. */
function pendiente<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

const store = () => useFollowedProductsStore.getState();

beforeEach(() => {
	resetAllStores();
	vi.clearAllMocks();
});

describe("lo que pregunta el escáner", () => {
	it("sin los códigos seguidos leídos, cuenta como que no lo seguís", () => {
		expect(isFollowing(null, "111")).toBe(false);
		expect(isFollowing(["111"], "111")).toBe(true);
		expect(isFollowing(["111"], "222")).toBe(false);
	});

	it("un GTIN-14 y su EAN-13 cuentan como el mismo producto, en los dos sentidos", () => {
		// El backend devuelve los códigos como los guardó, y el escáner puede leer el otro formato.
		expect(isFollowing(["07790895000997"], "7790895000997")).toBe(true);
		expect(isFollowing(["7790895000997"], "07790895000997")).toBe(true);
		expect(isFollowing(["07790895000997"], "7790895000980")).toBe(false);
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

	it("con otra cuenta empieza de cero y descarta la respuesta de la anterior", async () => {
		const vieja = pendiente<string[]>();
		mockEans.mockReturnValueOnce(vieja.promise);
		const lectura = store().loadFollowedEans("t1");

		mockEans.mockResolvedValueOnce([]);
		await store().loadFollowedEans("t2");
		vieja.resolve(["111"]);
		await lectura;

		expect(store().loadedFor).toBe("t2");
		expect(store().followedEans).toEqual([]);
	});

	it("seguir y dejar de seguir actualizan los códigos recién cuando el backend confirma", async () => {
		mockEans.mockResolvedValue(["111"]);
		await store().loadFollowedEans("t1");

		mockFollow.mockResolvedValue();
		await store().follow("t1", gaseosa);
		expect(mockFollow).toHaveBeenCalledWith("t1", gaseosa);
		expect(isFollowing(store().followedEans, gaseosa.ean)).toBe(true);
		expect(store().followedEans).toHaveLength(2);

		// Seguirlo otra vez no lo duplica.
		await store().follow("t1", gaseosa);
		expect(store().followedEans).toHaveLength(2);

		mockUnfollow.mockResolvedValue();
		await store().unfollow("t1", gaseosa.ean);
		expect(mockUnfollow).toHaveBeenCalledWith("t1", gaseosa.ean);
		expect(store().followedEans).toEqual(["111"]);
	});

	it("seguir el mismo producto en otro formato no lo agrega dos veces, y dejar de seguirlo lo saca", async () => {
		mockEans.mockResolvedValue(["07790895000997"]);
		await store().loadFollowedEans("t1");

		mockFollow.mockResolvedValue();
		await store().follow("t1", gaseosa);
		expect(store().followedEans).toEqual(["07790895000997"]);

		mockUnfollow.mockResolvedValue();
		await store().unfollow("t1", gaseosa.ean);
		expect(store().followedEans).toEqual([]);
	});

	it("si la lista no se pudo leer, seguir uno la vuelve a pedir en vez de quedarse solo con ese", async () => {
		mockEans.mockRejectedValueOnce(new Error("sin red"));
		await store().loadFollowedEans("t1");
		expect(store().followedEans).toBeNull();

		// El backend ya tenía otro seguido; después de seguir la gaseosa tiene los dos.
		mockFollow.mockResolvedValue();
		mockEans.mockResolvedValueOnce([gaseosa.ean, "111"]);
		await store().follow("t1", gaseosa);

		expect(isFollowing(store().followedEans, "111")).toBe(true);
		expect(isFollowing(store().followedEans, gaseosa.ean)).toBe(true);
	});

	it("si tampoco se puede volver a leer, queda sin saberse y no con una lista a medias", async () => {
		mockEans.mockRejectedValue(new Error("sin red"));
		await store().loadFollowedEans("t1");

		mockFollow.mockResolvedValue();
		await store().follow("t1", gaseosa);

		expect(mockEans).toHaveBeenCalledTimes(2);
		expect(store().followedEans).toBeNull();
	});

	it("una lectura vieja que llega tarde no pisa a la más nueva", async () => {
		const vieja = pendiente<string[]>();
		mockEans.mockReturnValueOnce(vieja.promise);
		const lectura = store().loadFollowedEans("t1");

		mockEans.mockResolvedValueOnce([gaseosa.ean, "111"]);
		await store().loadFollowedEans("t1");
		vieja.resolve(["111"]);
		await lectura;

		expect(store().followedEans).toEqual([gaseosa.ean, "111"]);
	});

	it("si seguir falla no queda marcado como seguido", async () => {
		mockFollow.mockRejectedValue(new Error("Ya seguís 30 productos."));
		await expect(store().follow("t1", gaseosa)).rejects.toThrow("30");
		expect(isFollowing(store().followedEans, gaseosa.ean)).toBe(false);
	});

	it("si dejar de seguir falla sigue marcado como seguido", async () => {
		mockEans.mockResolvedValue([gaseosa.ean]);
		await store().loadFollowedEans("t1");
		mockUnfollow.mockRejectedValue(new Error("sin red"));
		await expect(store().unfollow("t1", gaseosa.ean)).rejects.toThrow("sin red");
		expect(isFollowing(store().followedEans, gaseosa.ean)).toBe(true);
	});
});

describe("cerrar sesión", () => {
	it("resetAllStores borra los seguidos de la cuenta", async () => {
		mockEans.mockResolvedValue(["111"]);
		await store().loadFollowedEans("t1");

		resetAllStores();

		expect(store().followedEans).toBeNull();
		expect(store().loadedFor).toBeNull();
	});
});
