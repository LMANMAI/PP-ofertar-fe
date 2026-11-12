/**
 * Respuestas de ejemplo de los endpoints de promos bancarias (SPEC §4), con datos reales del
 * 31/10/2026 (datos-muestra/). Las usan los tests de schemas, de la lógica y del store.
 */
import type { BankPromo, BankPromoToday, BankPromoWeek, MyPaymentMethods, PaymentCatalog } from "../../services/bankPromosApi";

export const catalog: PaymentCatalog = {
	issuers: [
		{ slug: "banco-galicia", name: "Banco Galicia", kind: "bank" },
		{ slug: "banco-patagonia", name: "Banco Patagonia", kind: "bank" },
		{ slug: "tarjeta-naranja", name: "Tarjeta Naranja", kind: "card_issuer" },
		{ slug: "mercado-pago", name: "Mercado Pago", kind: "wallet" },
		{ slug: "naranja-x", name: "Naranja X", kind: "wallet" },
		{ slug: "club-la-nacion", name: "Club La Nación", kind: "club" },
	],
	networks: [
		{ slug: "visa", name: "Visa" },
		{ slug: "mastercard", name: "Mastercard" },
	],
	cardTypes: [
		{ slug: "credit", name: "Crédito" },
		{ slug: "debit", name: "Débito" },
		{ slug: "wallet", name: "Billetera" },
	],
	benefits: [{ slug: "jubilado", name: "Jubilado/a o pensionado/a", description: "Habilita las promos para jubilados" }],
};

export const mine: MyPaymentMethods = {
	methods: [
		{ id: 1, issuer: { slug: "banco-galicia", name: "Banco Galicia", kind: "bank" }, network: "visa", cardType: "credit" },
		{ id: 2, issuer: { slug: "mercado-pago", name: "Mercado Pago", kind: "wallet" }, network: null, cardType: "wallet" },
	],
	benefits: [],
};

let nextId = 100;

/** Una PromoView válida; cada test pisa lo que le importa. */
export function promo(over: Partial<BankPromo> = {}): BankPromo {
	return {
		id: nextId++,
		retailer: "carrefour",
		retailerName: "Carrefour",
		title: "Galicia Visa crédito",
		discount: { kind: "percent", percent: 25, text: "25% de descuento" },
		cap: { amount: 20000, period: "month" },
		channels: ["store", "online"],
		formats: ["hyper", "market"],
		validFrom: "2026-11-01",
		validTo: "2026-11-30",
		issuers: [{ slug: "banco-galicia", name: "Banco Galicia" }],
		allMethods: false,
		requires: { network: "visa", cardType: "credit" },
		percentRange: null,
		conditions: [],
		regions: null,
		match: "match",
		matchReason: "Con tu Banco Galicia Visa crédito",
		legalText: "25% con tarjetas de crédito Visa del Banco Galicia, tope mensual de $20.000.",
		qualityFlags: [],
		...over,
	};
}

export const week: BankPromoWeek = {
	from: "2026-11-01",
	to: "2026-11-07",
	mine: true,
	hasPaymentMethods: true,
	days: [
		{ date: "2026-11-01", weekday: 7, bestPercent: null, promos: [] },
		{ date: "2026-11-02", weekday: 1, bestPercent: 15, promos: [promo({ id: 1, percentRange: null, discount: { kind: "percent", percent: 15, text: "15%" } })] },
		{ date: "2026-11-03", weekday: 2, bestPercent: 25, promos: [promo({ id: 2 })] },
		{ date: "2026-11-04", weekday: 3, bestPercent: null, promos: [] },
		{ date: "2026-11-05", weekday: 4, bestPercent: 25, promos: [promo({ id: 2 })] },
		{ date: "2026-11-06", weekday: 5, bestPercent: null, promos: [] },
		{ date: "2026-11-07", weekday: 6, bestPercent: null, promos: [] },
	],
	notes: [{ kind: "rollover", fromDate: "2026-11-05" }],
};

export const today: BankPromoToday = {
	date: "2026-11-01",
	bestPercent: 25,
	promos: [promo()],
};
