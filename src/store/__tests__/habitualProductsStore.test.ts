import { beforeEach, describe, expect, it, vi } from "vitest";
import { addHabitualProduct, getHabitualEans, removeHabitualProduct } from "../../services/habitualProductsApi";
import { isInHabitual, resetAllStores, useHabitualProductsStore } from "..";

vi.mock("../../services/habitualProductsApi", () => ({
	addHabitualProduct: vi.fn(),
	getHabitualEans: vi.fn(),
	removeHabitualProduct: vi.fn(),
}));

const mockEans = vi.mocked(getHabitualEans);
const mockAdd = vi.mocked(addHabitualProduct);
const mockRemove = vi.mocked(removeHabitualProduct);

const gaseosa = { ean: "7790895000997", description: "Gaseosa", brand: null };

const store = () => useHabitualProductsStore.getState();

beforeEach(() => {
	resetAllStores();
	vi.clearAllMocks();
});

describe("isInHabitual", () => {
	it("compara normalizado", () => {
		expect(isInHabitual(["07790895000997"], gaseosa.ean)).toBe(true);
	});

	it("sin los códigos leídos cuenta como que no está", () => {
		expect(isInHabitual(null, gaseosa.ean)).toBe(false);
	});
});

describe("useHabitualProductsStore", () => {
	it("si falla la lectura queda sin leer, no como lista vacía", async () => {
		mockEans.mockRejectedValue(new Error("caído"));
		await store().loadEans("t");
		expect(store().eans).toBeNull();
	});

	it("suma recién cuando el backend confirma", async () => {
		mockEans.mockResolvedValue([]);
		await store().loadEans("t");
		mockAdd.mockRejectedValue(new Error("400"));
		await expect(store().add("t", gaseosa)).rejects.toThrow("400");
		expect(store().eans).toEqual([]);

		mockAdd.mockResolvedValue();
		await store().add("t", gaseosa);
		expect(store().eans).toEqual([gaseosa.ean]);
	});

	it("sumar sin los códigos leídos los vuelve a pedir en vez de dejarlos a medias", async () => {
		mockAdd.mockResolvedValue();
		mockEans.mockResolvedValue([gaseosa.ean, "7791234567891"]);
		await store().add("t", gaseosa);
		expect(store().eans).toEqual([gaseosa.ean, "7791234567891"]);
	});

	it("saca por EAN normalizado", async () => {
		mockEans.mockResolvedValue(["07790895000997", "7791234567891"]);
		await store().loadEans("t");
		mockRemove.mockResolvedValue();
		await store().remove("t", gaseosa.ean);
		expect(store().eans).toEqual(["7791234567891"]);
	});

	it("una respuesta de la sesión anterior no pisa a la nueva", async () => {
		let resolve!: (eans: string[]) => void;
		mockEans.mockReturnValueOnce(new Promise((res) => (resolve = res)));
		const vieja = store().loadEans("viejo");
		mockEans.mockResolvedValueOnce([]);
		await store().loadEans("nuevo");
		resolve([gaseosa.ean]);
		await vieja;
		expect(store().eans).toEqual([]);
	});

	it("resetAllStores la borra al cerrar sesión", async () => {
		mockEans.mockResolvedValue([gaseosa.ean]);
		await store().loadEans("t");
		resetAllStores();
		expect(store().eans).toBeNull();
	});
});
