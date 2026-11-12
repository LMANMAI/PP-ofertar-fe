import { describe, expect, it } from "vitest";
import { forgottenIn, habitualProducts, MIN_TRIPS_TO_BE_HABITUAL } from "../forgottenProducts";
import type { RecurringProduct } from "../../services";

function product(over: Partial<RecurringProduct> = {}): RecurringProduct {
	return {
		description: "Leche entera",
		barcode: "7791234567891",
		category: null,
		purchaseCount: 4,
		ticketCount: MIN_TRIPS_TO_BE_HABITUAL,
		inReferenceTicket: false,
		totalDiscounts: 0,
		lastPaidPrice: null,
		lastPaidAt: null,
		bestOffer: null,
		campaignOffers: [],
		alternativeOffers: [],
		followed: false,
		addedToHabitual: false,
		...over,
	};
}

describe("compra habitual", () => {
	it("incluye lo detectado en los tickets", () => {
		expect(habitualProducts([product()])).toHaveLength(1);
	});

	it("deja afuera una compra aislada", () => {
		expect(habitualProducts([product({ ticketCount: 1 })])).toEqual([]);
	});

	it("incluye lo sumado desde el escáner aunque nunca se haya comprado", () => {
		expect(habitualProducts([product({ ticketCount: 0, addedToHabitual: true })])).toHaveLength(1);
	});
});

describe("forgottenIn", () => {
	it("avisa de un producto sumado que nunca se compró", () => {
		const added = product({ ticketCount: 0, addedToHabitual: true });
		expect(forgottenIn([added])).toEqual([added]);
	});

	it("no avisa de lo que el ticket trae", () => {
		expect(forgottenIn([product({ addedToHabitual: true, inReferenceTicket: true })])).toEqual([]);
	});

	it("los sumados van primero: los pidió el usuario", () => {
		const names = forgottenIn([
			product({ description: "Detectado" }),
			product({ description: "Sumado", ticketCount: 0, addedToHabitual: true }),
		]).map((p) => p.description);
		expect(names).toEqual(["Sumado", "Detectado"]);
	});

	it("deja el tope a la hoja, que dice cuántos más hay", () => {
		const many = Array.from({ length: 8 }, (_, i) => product({ barcode: `779000000000${i}` }));
		expect(forgottenIn(many)).toHaveLength(8);
	});
});
