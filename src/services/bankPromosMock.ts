/**
 * Backend de prueba, en memoria, para Mis tarjetas y el calendario de promos bancarias.
 *
 * Se usa sólo con EXPO_PUBLIC_BANK_PROMOS_MOCK=1, mientras los endpoints del SPEC §4 no estén
 * desplegados. Implementa el contrato completo (la regla de match, el orden, `bestPercent` y la
 * nota del cambio de mes) y cada respuesta pasa por su schema en modo estricto, así que si el
 * mock se aleja del contrato falla acá y no en una pantalla.
 *
 * Las promos son las reales del 31/10/2026 (datos-muestra/ y las maquetas), con textos legales
 * resumidos. Las fechas se corren para que siempre haya algo que ver: las "del mes" vencen a los
 * 3 días de hoy (así se ve la nota del cambio de mes dentro de la semana) y las otras en 29 días.
 * Nada de esto viaja a ningún lado: cada sesión arranca sin tarjetas.
 */
import { ApiError, validate } from "../api/client";
import { BankPromoTodaySchema, BankPromoWeekSchema, MyPaymentMethodsSchema, PaymentCatalogSchema } from "../api/schemas";
import { addDays, argentinaToday, joinNames, methodLabel, promoPercent, provinceName, sameMethod, sortDayPromos, toInput, weekdayOf } from "../utils/bankPromos";
import type {
	BankPromo,
	BankPromoToday,
	BankPromoWeek,
	MyPaymentMethods,
	PaymentCatalog,
	PaymentMethod,
	SavePaymentMethodsBody,
	WeekQuery,
} from "./bankPromosApi";

const CATALOG: PaymentCatalog = {
	issuers: [
		{ slug: "banco-galicia", name: "Banco Galicia", kind: "bank" },
		{ slug: "banco-nacion", name: "Banco Nación", kind: "bank" },
		{ slug: "banco-patagonia", name: "Banco Patagonia", kind: "bank" },
		{ slug: "santander", name: "Santander", kind: "bank" },
		{ slug: "bbva", name: "BBVA", kind: "bank" },
		{ slug: "banco-macro", name: "Banco Macro", kind: "bank" },
		{ slug: "banco-hipotecario", name: "Banco Hipotecario", kind: "bank" },
		{ slug: "supervielle", name: "Supervielle", kind: "bank" },
		{ slug: "banco-ciudad", name: "Banco Ciudad", kind: "bank" },
		{ slug: "icbc", name: "ICBC", kind: "bank" },
		{ slug: "carrefour-banco", name: "Carrefour Banco", kind: "bank" },
		{ slug: "tarjeta-naranja", name: "Tarjeta Naranja", kind: "card_issuer" },
		{ slug: "naranja-x", name: "Naranja X", kind: "wallet" },
		{ slug: "mercado-pago", name: "Mercado Pago", kind: "wallet" },
		{ slug: "modo", name: "MODO", kind: "wallet" },
		{ slug: "cuenta-dni", name: "Cuenta DNI", kind: "wallet" },
		{ slug: "cencopay", name: "CencoPay", kind: "wallet" },
		{ slug: "uala", name: "Ualá", kind: "wallet" },
		{ slug: "club-la-nacion", name: "Club La Nación", kind: "club" },
	],
	networks: [
		{ slug: "visa", name: "Visa" },
		{ slug: "mastercard", name: "Mastercard" },
		{ slug: "amex", name: "American Express" },
		{ slug: "cabal", name: "Cabal" },
		{ slug: "naranja", name: "Naranja" },
	],
	cardTypes: [
		{ slug: "credit", name: "Crédito" },
		{ slug: "debit", name: "Débito" },
		{ slug: "prepaid", name: "Prepaga" },
		{ slug: "wallet", name: "Billetera" },
	],
	benefits: [
		{ slug: "jubilado", name: "Jubilado/a o pensionado/a", description: "Habilita las promos para jubilados" },
		{ slug: "empleado_publico", name: "Empleado/a público/a", description: "Algunos bancos tienen promos propias" },
		{ slug: "plan_sueldo", name: "Plan sueldo", description: "Cobrás el sueldo en el banco de la tarjeta" },
		{ slug: "club_la_nacion", name: "Club La Nación", description: "Programa de beneficios" },
		{ slug: "jumbo_mas", name: "Jumbo+", description: "Programa de beneficios de Jumbo" },
		{ slug: "mi_carrefour", name: "Mi Carrefour", description: "Programa de beneficios de Carrefour" },
	],
};

const RETAILER_NAMES: Record<string, string> = { carrefour: "Carrefour", jumbo: "Jumbo", disco: "Disco", vea: "Vea" };

type Target = { issuer: string | null; network?: string; cardType?: string; package?: string; percent?: number };

type MockPromo = {
	id: number;
	retailers: string[];
	title: string;
	discount: BankPromo["discount"];
	cap?: BankPromo["cap"];
	channels: BankPromo["channels"];
	days: number[];
	/** "mes": vence a los 3 días; "largo": en 29. */
	until: "mes" | "largo";
	targets: Target[];
	conditions?: string[];
	regions?: string[];
	legal: string;
	flags?: string[];
};

const pct = (percent: number, text = `${percent}% de descuento`): BankPromo["discount"] => ({ kind: "percent", percent, text });

const PROMOS: MockPromo[] = [
	{ id: 1, retailers: ["jumbo", "disco", "vea"], title: "Martes Naranja X", discount: pct(30, "30% de reintegro"), channels: ["store", "online"], days: [2], until: "mes", targets: [{ issuer: "naranja-x" }], legal: "Reintegro con Naranja X los martes, o hasta agotar 80.000 reintegros. Se acredita después de la compra." },
	{ id: 2, retailers: ["jumbo", "disco"], title: "Hipotecario débito", discount: pct(25), channels: ["store"], days: [2], until: "mes", targets: [{ issuer: "banco-hipotecario", cardType: "debit" }], legal: "25% con tarjeta de débito pagando desde App Hipotecario o App MODO, todos los martes." },
	{ id: 3, retailers: ["jumbo", "disco"], title: "Martes jubilados Supervielle", discount: pct(25), cap: { amount: 25000, period: "month" }, channels: ["store"], days: [2], until: "mes", targets: [{ issuer: "supervielle", cardType: "debit" }], conditions: ["jubilado"], legal: "Martes jubilados: 25% con tarjeta de débito de jubilados, tope mensual de $25.000 por cuenta." },
	{ id: 4, retailers: ["jumbo", "disco"], title: "Patagonia crédito", discount: pct(30), channels: ["store", "online"], days: [5], until: "mes", targets: [{ issuer: "banco-patagonia", cardType: "credit" }], flags: ["days_mismatch_legal"], legal: "30% con todas las tarjetas de crédito del Banco Patagonia LOS VIERNES." },
	{ id: 5, retailers: ["disco"], title: "MODO fin de semana", discount: pct(20), channels: ["store", "online"], days: [5, 6], until: "mes", targets: [{ issuer: "modo" }], legal: "20% pagando con MODO los viernes y sábados. El envío o retiro puede ser cualquier día." },
	{ id: 6, retailers: ["jumbo"], title: "MODO martes y jueves", discount: pct(20), channels: ["store", "online"], days: [2, 4], until: "mes", targets: [{ issuer: "modo" }], legal: "20% pagando con MODO los martes y jueves." },
	{ id: 7, retailers: ["jumbo", "disco", "vea"], title: "CencoPay", discount: pct(40), cap: { amount: 15000, period: "day" }, channels: ["store"], days: [5, 6], until: "mes", targets: [{ issuer: "cencopay" }], legal: "40% con CencoPay Cuenta, tope de reintegro de $15.000 por día. No incluye electrodomésticos." },
	{ id: 8, retailers: ["jumbo"], title: "Miércoles Jumbo+", discount: pct(15), channels: ["store", "online"], days: [3], until: "largo", targets: [{ issuer: null }], conditions: ["jubilado", "jumbo_mas"], legal: "Todos los miércoles, 15% para jubilados y mayores de 60 presentando Jumbo+." },
	{ id: 9, retailers: ["carrefour"], title: "Patagonia Visa", discount: pct(20), channels: ["store", "online"], days: [3], until: "largo", targets: [{ issuer: "banco-patagonia", network: "visa" }, { issuer: "banco-patagonia", network: "visa", package: "Patagonia Clásica", percent: 15 }, { issuer: "banco-patagonia", network: "visa", package: "Patagonia Singular", percent: 35 }], legal: "20% en un pago con débito o crédito Visa del Banco Patagonia. Hay variantes del 15% al 35% según el paquete de cuenta." },
	{ id: 10, retailers: ["carrefour"], title: "Mercado Pago jueves", discount: pct(15), channels: ["store"], days: [4], until: "mes", targets: [{ issuer: "mercado-pago" }], legal: "15% de descuento sin tope pagando con Mercado Pago. Acumulable con todas las promos." },
	{ id: 11, retailers: ["carrefour"], title: "Mercado Pago lunes", discount: pct(15), channels: ["store"], days: [1], until: "mes", targets: [{ issuer: "mercado-pago" }], legal: "15% de descuento pagando con Mercado Pago. Acumulable con todas las promos." },
	{ id: 12, retailers: ["carrefour"], title: "Mercado Pago viernes", discount: pct(10), channels: ["store"], days: [5], until: "mes", targets: [{ issuer: "mercado-pago" }], legal: "10% de descuento sin tope pagando con Mercado Pago." },
	{ id: 13, retailers: ["carrefour"], title: "Cuenta DNI", discount: pct(10), channels: ["store"], days: [3], until: "mes", targets: [{ issuer: "cuenta-dni" }], legal: "10% con Cuenta DNI, sin tope. Jubilados, 5% adicional." },
	{ id: 14, retailers: ["carrefour"], title: "Carrefour Banco martes", discount: pct(20), channels: ["store", "online"], days: [2], until: "mes", targets: [{ issuer: "carrefour-banco", cardType: "credit" }], legal: "20% con Tarjeta de Crédito de Carrefour Banco." },
	{ id: 15, retailers: ["carrefour"], title: "Carrefour Banco", discount: pct(15), channels: ["store", "online"], days: [1, 3, 5, 6, 7], until: "largo", targets: [{ issuer: "carrefour-banco", cardType: "credit" }], legal: "15% en la compra del súper pagando con Tarjeta de Crédito Carrefour Banco." },
	{ id: 16, retailers: ["carrefour"], title: "Club La Nación", discount: pct(15), channels: ["store"], days: [1], until: "mes", targets: [{ issuer: null }], conditions: ["club_la_nacion"], legal: "15% de descuento con Club La Nación, sin tope." },
	{ id: 17, retailers: ["carrefour"], title: "Naranja cuotas", discount: { kind: "installments", installments: 4, text: "4 cuotas sin interés" }, channels: ["store", "online"], days: [1, 2, 3, 4, 5, 6, 7], until: "largo", targets: [{ issuer: "tarjeta-naranja", network: "naranja" }], legal: "4 cuotas sin interés para toda la compra con Tarjeta Naranja." },
	{ id: 18, retailers: ["carrefour"], title: "Nación jubilados", discount: pct(5), channels: ["store"], days: [1, 2, 3, 4, 5], until: "mes", targets: [{ issuer: "banco-nacion", network: "visa", cardType: "credit" }, { issuer: "banco-nacion", network: "mastercard" }], conditions: ["jubilado"], legal: "5% para jubilados y pensionados con tarjetas de crédito Visa y Mastercard y débito Mastercard del Banco Nación." },
	{ id: 19, retailers: ["carrefour"], title: "Online todos los medios", discount: pct(10), channels: ["online"], days: [4], until: "largo", targets: [{ issuer: null }], legal: "10% OFF con todos los medios de pago, exclusivo online." },
	{ id: 20, retailers: ["carrefour"], title: "Bancos adheridos", discount: pct(20), channels: ["store"], days: [6], until: "mes", targets: [], flags: ["issuer_unknown"], legal: "20% con tarjetas de crédito de bancos adheridos. Consultá en la línea de cajas." },
	{ id: 21, retailers: ["jumbo"], title: "Club La Voz", discount: pct(25), channels: ["store"], days: [3], until: "mes", targets: [{ issuer: null }], regions: ["CORDOBA"], legal: "25% con Club La Voz en sucursales de Córdoba." },
	{ id: 22, retailers: ["carrefour"], title: "Galicia Visa crédito", discount: pct(25), cap: { amount: 20000, period: "month" }, channels: ["store", "online"], days: [4], until: "largo", targets: [{ issuer: "banco-galicia", network: "visa", cardType: "credit" }], legal: "25% con tarjetas de crédito Visa del Banco Galicia, tope mensual de $20.000." },
	{ id: 23, retailers: ["jumbo", "disco", "vea"], title: "Galicia Mastercard", discount: pct(20), channels: ["store"], days: [6], until: "largo", targets: [{ issuer: "banco-galicia", network: "mastercard" }], legal: "20% con tarjetas Mastercard del Banco Galicia los sábados." },
];

/** Por qué una promo es "near" cuando falta un requisito de la persona (D6). */
const CONDITION_REASONS: Record<string, string> = {
	jubilado: "Para jubilados",
	empleado_publico: "Para empleados públicos",
	plan_sueldo: "Pide plan sueldo",
	club_la_nacion: "Pide Club La Nación",
	jumbo_mas: "Pide Jumbo+",
	mi_carrefour: "Pide Mi Carrefour",
};

type Account = { methods: PaymentMethod[]; benefits: string[]; nextId: number };
const accounts = new Map<string, Account>();

function account(token: string): Account {
	let acc = accounts.get(token);
	if (!acc) {
		acc = { methods: [], benefits: [], nextId: 1 };
		accounts.set(token, acc);
	}
	return acc;
}

/** Una demora corta, para que se vean los estados de carga. */
function later<T>(value: () => T, ms = 250): Promise<T> {
	return new Promise((resolve, reject) =>
		setTimeout(() => {
			try {
				resolve(value());
			} catch (e) {
				reject(e);
			}
		}, ms),
	);
}

function fits(t: Target, m: PaymentMethod): boolean {
	return (
		(t.issuer == null || t.issuer === m.issuer.slug) &&
		(t.network == null || t.network === m.network) &&
		(t.cardType == null || t.cardType === m.cardType)
	);
}

function nearReason(targets: Target[], m: PaymentMethod): string {
	const types = [...new Set(targets.map((t) => t.cardType).filter((x): x is string => !!x))];
	if (types.length && !types.includes(m.cardType ?? "")) {
		return `Pide ${joinNames(types.map((t) => CATALOG.cardTypes.find((c) => c.slug === t)?.name.toLowerCase() ?? t), "o")}`;
	}
	const nets = [...new Set(targets.map((t) => t.network).filter((x): x is string => !!x))];
	return `Pide ${joinNames(nets.map((n) => CATALOG.networks.find((c) => c.slug === n)?.name ?? n), "o")}`;
}

/** Igual que Provincias.zona del backend: lista separada por coma; AMBA o GBA = CABA + Buenos Aires. */
function zoneOf(province: string | null | undefined): string[] {
	return (province ?? "")
		.split(",")
		.map((p) => p.trim().toUpperCase())
		.filter(Boolean)
		.flatMap((p) => (p === "AMBA" || p === "GBA" ? ["CABA", "BUENOS_AIRES"] : [p]));
}

/** La regla de match del SPEC §4, por promo. */
export function evaluate(
	p: MockPromo,
	acc: Pick<Account, "methods" | "benefits">,
	province: string | null | undefined,
): { match: BankPromo["match"]; reason: string | null } {
	if (p.flags?.includes("issuer_unknown") || p.targets.length === 0) return { match: "none", reason: null };

	let card: { match: BankPromo["match"]; reason: string | null };
	// "all" sólo si un target no pide emisor, red ni tipo; "cualquier Visa de crédito" se cruza con las tarjetas (D17).
	if (p.targets.some((t) => t.issuer == null && t.network == null && t.cardType == null)) {
		card = { match: "all", reason: null };
	} else {
		const full = acc.methods.find((m) => p.targets.some((t) => fits(t, m)));
		if (full) {
			card = { match: "match", reason: `Con tu ${methodLabel(full, CATALOG.networks, CATALOG.cardTypes)}` };
		} else {
			const sameIssuer = (t: Target, m: PaymentMethod) => t.issuer == null || t.issuer === m.issuer.slug;
			const same = acc.methods.find((m) => p.targets.some((t) => sameIssuer(t, m)));
			if (!same) return { match: "none", reason: null };
			card = { match: "near", reason: nearReason(p.targets.filter((t) => sameIssuer(t, same)), same) };
		}
	}

	if (card.match === "near") return card;
	const missing = (p.conditions ?? []).find((c) => !acc.benefits.includes(c));
	if (missing) return { match: "near", reason: CONDITION_REASONS[missing] ?? "Pide un requisito" };
	const zone = zoneOf(province);
	if (p.regions?.length && !p.regions.some((r) => zone.includes(r))) {
		return { match: "near", reason: `Sólo en ${joinNames(p.regions.map(provinceName))}` };
	}
	return card;
}

function toViews(p: MockPromo, today: string, acc: Account, province: string | null | undefined): BankPromo[] {
	const { match, reason } = evaluate(p, acc, province);
	const overrides = p.targets.map((t) => t.percent).filter((x): x is number => x != null);
	const base = p.discount.percent;
	const range =
		overrides.length && base != null ? { min: Math.min(base, ...overrides), max: Math.max(base, ...overrides) } : null;
	const shared = <K extends "network" | "cardType">(k: K) => {
		const values = [...new Set(p.targets.map((t) => t[k] ?? null))];
		return values.length === 1 ? values[0] : null;
	};
	const network = shared("network");
	const cardType = shared("cardType");
	const issuers = [...new Set(p.targets.map((t) => t.issuer).filter((x): x is string => !!x))].map((slug) => ({
		slug,
		name: CATALOG.issuers.find((i) => i.slug === slug)?.name ?? slug,
	}));
	return p.retailers.map((retailer, i) => ({
		id: p.id * 10 + i,
		retailer,
		retailerName: RETAILER_NAMES[retailer] ?? retailer,
		title: p.title,
		discount: p.discount,
		cap: p.cap ?? null,
		channels: p.channels,
		formats: null,
		validFrom: addDays(today, -20),
		validTo: addDays(today, p.until === "mes" ? 3 : 29),
		issuers,
		allMethods: p.targets.some((t) => t.issuer == null) && !p.flags?.includes("issuer_unknown"),
		requires: network || cardType ? { network, cardType } : null,
		percentRange: range,
		conditions: p.conditions ?? [],
		regions: p.regions ?? null,
		match,
		matchReason: reason,
		legalText: p.legal,
		qualityFlags: p.flags ?? [],
	}));
}

function promosOn(date: string, today: string, acc: Account, province: string | null | undefined): BankPromo[] {
	const wd = weekdayOf(date);
	return PROMOS.filter((p) => p.days.includes(wd))
		.flatMap((p) => toViews(p, today, acc, province))
		.filter((v) => v.validFrom <= date && date <= v.validTo);
}

function best(promos: BankPromo[], onlyUsable: boolean): number | null {
	const values = promos
		.filter((p) => !onlyUsable || p.match === "match" || p.match === "all")
		.map(promoPercent)
		.filter((x): x is number => x != null);
	return values.length ? Math.max(...values) : null;
}

function buildWeek(token: string, q: WeekQuery): BankPromoWeek {
	const today = argentinaToday();
	const from = q.from ?? today;
	const acc = account(token);
	const days = Array.from({ length: 7 }, (_, i) => {
		const date = addDays(from, i);
		const promos = sortDayPromos(promosOn(date, today, acc, q.province), q.mine);
		return { date, weekday: weekdayOf(date), bestPercent: best(promos, q.mine), promos };
	});
	// La nota va desde el primer día en que vence algo que el día anterior seguía vigente.
	const allViews = PROMOS.flatMap((p) => toViews(p, today, acc, q.province));
	const expiry = days
		.slice(1)
		.map((d) => d.date)
		.find((date) => allViews.some((v) => v.validTo === addDays(date, -1)));
	return {
		from,
		to: addDays(from, 6),
		mine: q.mine,
		hasPaymentMethods: acc.methods.length > 0,
		days,
		notes: expiry ? [{ kind: "rollover", fromDate: expiry }] : [],
	};
}

function issuerOf(slug: string) {
	const issuer = CATALOG.issuers.find((i) => i.slug === slug);
	if (!issuer) throw new ApiError("http", `Emisor desconocido: ${slug}`, 400);
	return issuer;
}

export const bankPromosMock = {
	catalog(): Promise<PaymentCatalog> {
		return later(() => validate("mock GET /payment-methods/catalog", CATALOG, PaymentCatalogSchema, "strict"));
	},

	getMine(token: string): Promise<MyPaymentMethods> {
		return later(() => {
			const acc = account(token);
			return validate("mock GET /me/payment-methods", { methods: acc.methods, benefits: acc.benefits }, MyPaymentMethodsSchema, "strict");
		});
	},

	putMine(token: string, body: SavePaymentMethodsBody): Promise<MyPaymentMethods> {
		return later(() => {
			const acc = account(token);
			const methods: PaymentMethod[] = [];
			for (const input of body.methods) {
				const issuer = issuerOf(input.issuerSlug);
				if (input.network && !CATALOG.networks.some((n) => n.slug === input.network)) throw new ApiError("http", `Red desconocida: ${input.network}`, 400);
				if (input.cardType && !CATALOG.cardTypes.some((t) => t.slug === input.cardType)) throw new ApiError("http", `Tipo desconocido: ${input.cardType}`, 400);
				if (methods.some((m) => sameMethod(toInput(m), input))) continue;
				const kept = acc.methods.find((m) => sameMethod(toInput(m), input));
				methods.push(kept ?? { id: acc.nextId++, issuer, network: input.network ?? null, cardType: input.cardType ?? null });
			}
			for (const b of body.benefits) {
				if (!CATALOG.benefits.some((x) => x.slug === b)) throw new ApiError("http", `Beneficio desconocido: ${b}`, 400);
			}
			acc.methods = methods;
			acc.benefits = [...new Set(body.benefits)];
			return validate("mock PUT /me/payment-methods", { methods: acc.methods, benefits: acc.benefits }, MyPaymentMethodsSchema, "strict");
		});
	},

	deleteMine(token: string, id: number): Promise<void> {
		return later(() => {
			const acc = account(token);
			if (!acc.methods.some((m) => m.id === id)) throw new ApiError("http", "Esa tarjeta no es tuya.", 404);
			acc.methods = acc.methods.filter((m) => m.id !== id);
		});
	},

	week(token: string, q: WeekQuery): Promise<BankPromoWeek> {
		return later(() => validate("mock GET /bank-promotions/week", buildWeek(token, q), BankPromoWeekSchema, "strict"), 350);
	},

	today(token: string, province?: string | null): Promise<BankPromoToday> {
		return later(() => {
			// Como el backend (SPEC §4): con mine=true vienen match, all y near (nunca none), las 3
			// primeras en el orden del día; bestPercent es el del día entero, sólo sobre match y all.
			const day = buildWeek(token, { mine: true, province }).days[0];
			const today: BankPromoToday = { date: day.date, bestPercent: day.bestPercent, promos: day.promos.slice(0, 3) };
			return validate("mock GET /bank-promotions/today", today, BankPromoTodaySchema, "strict");
		});
	},

	/** Para los tests: vuelve todas las cuentas a cero. */
	resetForTests() {
		accounts.clear();
	},
};
