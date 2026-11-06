import { beforeEach, describe, expect, it } from "vitest";
import { bankPromosMock, evaluate } from "../bankPromosMock";
import type { PaymentMethod } from "../bankPromosApi";

/**
 * El mock implementa la regla de match del SPEC §4: si se aleja del contrato, la app se prueba
 * contra algo que el backend no va a hacer. Cada respuesta ya pasa por su schema en modo strict.
 */
const galiciaVisaCredito: PaymentMethod = { id: 1, issuer: { slug: "banco-galicia", name: "Banco Galicia", kind: "bank" }, network: "visa", cardType: "credit" };
const galiciaMasterDebito: PaymentMethod = { id: 2, issuer: { slug: "banco-galicia", name: "Banco Galicia", kind: "bank" }, network: "mastercard", cardType: "debit" };

const base = { id: 1, retailers: ["carrefour"], title: "x", discount: { kind: "percent" as const, percent: 20, text: "20%" }, channels: ["store" as const], days: [1], until: "largo" as const, legal: "" };

describe("regla de match (SPEC §4)", () => {
	it("emisor, red y tipo iguales (o NULL en el target): match con 'Con tu …'", () => {
		const p = { ...base, targets: [{ issuer: "banco-galicia", network: "visa" }] };
		expect(evaluate(p, { methods: [galiciaVisaCredito], benefits: [] }, null)).toEqual({ match: "match", reason: "Con tu Banco Galicia Visa crédito" });
	});

	it("mismo emisor y otro tipo: near 'Pide crédito'", () => {
		const p = { ...base, targets: [{ issuer: "banco-galicia", cardType: "credit" }] };
		expect(evaluate(p, { methods: [galiciaMasterDebito], benefits: [] }, null)).toEqual({ match: "near", reason: "Pide crédito" });
	});

	it("mismo emisor y otra red: near 'Pide Visa'", () => {
		const p = { ...base, targets: [{ issuer: "banco-galicia", network: "visa" }] };
		expect(evaluate(p, { methods: [galiciaMasterDebito], benefits: [] }, null)).toEqual({ match: "near", reason: "Pide Visa" });
	});

	it("otro emisor: none", () => {
		const p = { ...base, targets: [{ issuer: "santander" }] };
		expect(evaluate(p, { methods: [galiciaVisaCredito], benefits: [] }, null).match).toBe("none");
	});

	it("target sin emisor: all, aunque no tengas tarjetas", () => {
		const p = { ...base, targets: [{ issuer: null }] };
		expect(evaluate(p, { methods: [], benefits: [] }, null).match).toBe("all");
	});

	it("issuer_unknown nunca es 'all'", () => {
		const p = { ...base, targets: [], flags: ["issuer_unknown"] };
		expect(evaluate(p, { methods: [galiciaVisaCredito], benefits: [] }, null).match).toBe("none");
	});

	it("condición no declarada (D6): near 'Para jubilados'; declarada: match", () => {
		const p = { ...base, targets: [{ issuer: "banco-galicia" }], conditions: ["jubilado"] };
		expect(evaluate(p, { methods: [galiciaVisaCredito], benefits: [] }, null)).toEqual({ match: "near", reason: "Para jubilados" });
		expect(evaluate(p, { methods: [galiciaVisaCredito], benefits: ["jubilado"] }, null).match).toBe("match");
	});

	it("promo regional sin zona del usuario (D7): near 'Sólo en Córdoba'", () => {
		const p = { ...base, targets: [{ issuer: null }], regions: ["CORDOBA"] };
		expect(evaluate(p, { methods: [], benefits: [] }, null)).toEqual({ match: "near", reason: "Sólo en Córdoba" });
		expect(evaluate(p, { methods: [], benefits: [] }, "CORDOBA").match).toBe("all");
	});

	it("zona AMBA (D18): matchea promos de CABA o de Buenos Aires, no las de otras provincias", () => {
		const promo = (regions: string[]) => ({ ...base, targets: [{ issuer: null }], regions });
		expect(evaluate(promo(["CABA"]), { methods: [], benefits: [] }, "AMBA").match).toBe("all");
		expect(evaluate(promo(["BUENOS_AIRES"]), { methods: [], benefits: [] }, "AMBA").match).toBe("all");
		expect(evaluate(promo(["CORDOBA"]), { methods: [], benefits: [] }, "AMBA")).toEqual({ match: "near", reason: "Sólo en Córdoba" });
	});

	it("'cualquier Visa o Master de crédito' (D17): se cruza con las tarjetas, no es 'todos'", () => {
		const p = { ...base, targets: [{ issuer: null, network: "visa", cardType: "credit" }, { issuer: null, network: "mastercard", cardType: "credit" }] };
		expect(evaluate(p, { methods: [galiciaVisaCredito], benefits: [] }, null)).toEqual({ match: "match", reason: "Con tu Banco Galicia Visa crédito" });
		expect(evaluate(p, { methods: [galiciaMasterDebito], benefits: [] }, null)).toEqual({ match: "near", reason: "Pide crédito" });
		expect(evaluate(p, { methods: [], benefits: [] }, null).match).toBe("none");
	});
});

describe("mock de los endpoints", () => {
	beforeEach(() => bankPromosMock.resetForTests());

	it("sin tarjetas, la semana 'mine' dice hasPaymentMethods=false y no trae none", async () => {
		const w = await bankPromosMock.week("t", { mine: true, from: "2026-11-02" });
		expect(w.hasPaymentMethods).toBe(false);
		expect(w.days).toHaveLength(7);
		expect(w.days.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(w.days.flatMap((d) => d.promos).some((p) => p.match === "none")).toBe(false);
	});

	it("PUT reemplaza el conjunto, conserva ids, valida slugs (400) y DELETE ajeno es 404", async () => {
		const a = await bankPromosMock.putMine("t", { methods: [{ issuerSlug: "mercado-pago", cardType: "wallet" }], benefits: [] });
		const id = a.methods[0].id;
		const b = await bankPromosMock.putMine("t", { methods: [{ issuerSlug: "mercado-pago", cardType: "wallet" }, { issuerSlug: "banco-galicia", network: "visa", cardType: "credit" }], benefits: ["jubilado"] });
		expect(b.methods.map((m) => m.id)[0]).toBe(id);
		expect(b.benefits).toEqual(["jubilado"]);
		await expect(bankPromosMock.putMine("t", { methods: [{ issuerSlug: "banco-inventado" }], benefits: [] })).rejects.toMatchObject({ status: 400 });
		await expect(bankPromosMock.deleteMine("otro-token", id)).rejects.toMatchObject({ status: 404 });
	});

	it("con Mercado Pago, la tira de hoy trae como mucho 3 promos y ninguna none (como el backend)", async () => {
		await bankPromosMock.putMine("t", { methods: [{ issuerSlug: "mercado-pago", cardType: "wallet" }], benefits: [] });
		const t = await bankPromosMock.today("t");
		expect(t.promos.length).toBeLessThanOrEqual(3);
		expect(t.promos.some((p) => p.match === "none")).toBe(false);
	});
});
