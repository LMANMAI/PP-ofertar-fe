import { beforeEach, describe, expect, it, vi } from "vitest";
import { catalog, mine } from "../../api/__tests__/bankPromosFixtures";
import { deletePaymentMethod, getMyPaymentMethods, getPaymentCatalog, savePaymentMethods } from "../../services/bankPromosApi";
import { DuplicateMethodError, resetAllStores, useBankPromosStore } from "..";

vi.mock("../../services/bankPromosApi", () => ({
	getPaymentCatalog: vi.fn(),
	getMyPaymentMethods: vi.fn(),
	savePaymentMethods: vi.fn(),
	deletePaymentMethod: vi.fn(),
}));

const mockCatalog = vi.mocked(getPaymentCatalog);
const mockMine = vi.mocked(getMyPaymentMethods);
const mockSave = vi.mocked(savePaymentMethods);
const mockDelete = vi.mocked(deletePaymentMethod);

beforeEach(() => {
	resetAllStores();
	vi.clearAllMocks();
	mockCatalog.mockResolvedValue(catalog);
	mockMine.mockResolvedValue(mine);
});

describe("useBankPromosStore", () => {
	it("load trae catálogo y tarjetas", async () => {
		await useBankPromosStore.getState().load("t1");
		expect(useBankPromosStore.getState().catalog).toEqual(catalog);
		expect(useBankPromosStore.getState().mine).toEqual(mine);
	});

	it("agregar manda el conjunto completo (PUT reemplaza) y sube la revisión", async () => {
		await useBankPromosStore.getState().load("t1");
		const saved = { ...mine, methods: [...mine.methods, { id: 3, issuer: catalog.issuers[1], network: null, cardType: "debit" }] };
		mockSave.mockResolvedValue(saved);
		await useBankPromosStore.getState().addMethod("t1", { issuerSlug: "banco-patagonia", network: null, cardType: "debit" });
		expect(mockSave).toHaveBeenCalledWith("t1", {
			methods: [
				{ issuerSlug: "banco-galicia", network: "visa", cardType: "credit" },
				{ issuerSlug: "mercado-pago", network: null, cardType: "wallet" },
				{ issuerSlug: "banco-patagonia", network: null, cardType: "debit" },
			],
			benefits: [],
		});
		expect(useBankPromosStore.getState().mine).toEqual(saved);
		expect(useBankPromosStore.getState().revision).toBe(1);
	});

	it("una tarjeta repetida no se manda", async () => {
		await useBankPromosStore.getState().load("t1");
		await expect(
			useBankPromosStore.getState().addMethod("t1", { issuerSlug: "banco-galicia", network: "visa", cardType: "credit" }),
		).rejects.toBeInstanceOf(DuplicateMethodError);
		expect(mockSave).not.toHaveBeenCalled();
		expect(useBankPromosStore.getState().revision).toBe(0);
	});

	it("si el backend falla al guardar, nada cambia", async () => {
		await useBankPromosStore.getState().load("t1");
		mockSave.mockRejectedValue(new Error("400"));
		await expect(useBankPromosStore.getState().setBenefit("t1", "jubilado", true)).rejects.toThrow("400");
		expect(useBankPromosStore.getState().mine).toEqual(mine);
		expect(useBankPromosStore.getState().revision).toBe(0);
	});

	it("quitar llama al DELETE y la saca de la lista", async () => {
		await useBankPromosStore.getState().load("t1");
		mockDelete.mockResolvedValue();
		await useBankPromosStore.getState().removeMethod("t1", 1);
		expect(mockDelete).toHaveBeenCalledWith("t1", 1);
		expect(useBankPromosStore.getState().mine?.methods.map((m) => m.id)).toEqual([2]);
		expect(useBankPromosStore.getState().revision).toBe(1);
	});

	it("los beneficios se suman y se quitan sin tocar las tarjetas", async () => {
		await useBankPromosStore.getState().load("t1");
		mockSave.mockImplementation(async (_t, body) => ({ methods: mine.methods, benefits: body.benefits }));
		await useBankPromosStore.getState().setBenefit("t1", "jubilado", true);
		expect(mockSave.mock.calls[0][1].benefits).toEqual(["jubilado"]);
		expect(mockSave.mock.calls[0][1].methods).toHaveLength(2);
		await useBankPromosStore.getState().setBenefit("t1", "jubilado", false);
		expect(mockSave.mock.calls[1][1].benefits).toEqual([]);
	});

	it("una respuesta de la sesión anterior no pisa la nueva, y logout limpia todo", async () => {
		let resolver: (v: typeof mine) => void = () => {};
		mockMine.mockReturnValueOnce(new Promise((r) => (resolver = r)));
		const vieja = useBankPromosStore.getState().load("t1");
		mockMine.mockResolvedValueOnce({ methods: [], benefits: [] });
		await useBankPromosStore.getState().load("t2");
		resolver(mine);
		await vieja;
		expect(useBankPromosStore.getState().mine).toEqual({ methods: [], benefits: [] });
		resetAllStores();
		expect(useBankPromosStore.getState().mine).toBeNull();
		expect(useBankPromosStore.getState().catalog).toBeNull();
	});
});
