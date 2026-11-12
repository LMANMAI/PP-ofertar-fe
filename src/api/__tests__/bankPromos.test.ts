import { afterEach, describe, expect, it, vi } from "vitest";
import {
	BankPromoSchema,
	BankPromoTodaySchema,
	BankPromoWeekSchema,
	MyPaymentMethodsSchema,
	PaymentCatalogSchema,
} from "../schemas";
import { ApiContractError } from "../client";
import {
	deletePaymentMethod,
	getBankPromosToday,
	getBankPromosWeek,
	getMyPaymentMethods,
	getPaymentCatalog,
	savePaymentMethods,
} from "../../services/bankPromosApi";
import { catalog, mine, promo, today, week } from "./bankPromosFixtures";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("schemas de promos bancarias: respuestas con la forma del SPEC §4", () => {
	it.each([
		["catálogo", PaymentCatalogSchema, catalog],
		["mis tarjetas", MyPaymentMethodsSchema, mine],
		["PromoView", BankPromoSchema, promo()],
		["semana", BankPromoWeekSchema, week],
		["hoy", BankPromoTodaySchema, today],
	] as const)("%s", (_n, schema, ejemplo) => {
		const r = schema.safeParse(ejemplo);
		expect(r.error?.issues ?? []).toEqual([]);
		expect(r.success).toBe(true);
	});

	it("los campos `x?` del contrato se aceptan ausentes o en null (Jackson hace las dos cosas)", () => {
		expect(BankPromoSchema.safeParse(promo({ discount: { kind: "installments", installments: 6, text: "6 cuotas" } })).success).toBe(true);
		expect(
			BankPromoSchema.safeParse(promo({ discount: { kind: "percent", percent: 20, installments: null, amount: null, text: "20%" } })).success,
		).toBe(true);
		expect(BankPromoSchema.safeParse(promo({ requires: { network: "visa" } })).success).toBe(true);
		expect(BankPromoSchema.safeParse(promo({ requires: { network: null, cardType: "credit", package: null } })).success).toBe(true);
	});

	it("un backend más nuevo que agrega campos no rompe a la app", () => {
		expect(BankPromoSchema.safeParse({ ...promo(), campoNuevo: 1 }).success).toBe(true);
	});
});

describe("schemas de promos bancarias: un cambio de contrato se detecta", () => {
	it("match fuera del enum", () => {
		const r = BankPromoSchema.safeParse(promo({ match: "maybe" as never }));
		expect(r.success).toBe(false);
		expect(r.error?.issues[0].path).toEqual(["match"]);
	});

	it("kind del descuento fuera del enum", () => {
		expect(BankPromoSchema.safeParse(promo({ discount: { kind: "points" as never, text: "x" } })).success).toBe(false);
	});

	it("canal desconocido", () => {
		expect(BankPromoSchema.safeParse(promo({ channels: ["store", "app"] as never })).success).toBe(false);
	});

	it("fecha con hora en vez de YYYY-MM-DD", () => {
		expect(BankPromoSchema.safeParse(promo({ validTo: "2026-11-30T23:59:59" })).success).toBe(false);
	});

	it("campo obligatorio ausente (allMethods)", () => {
		const { allMethods: _quitado, ...sin } = promo();
		const r = BankPromoSchema.safeParse(sin);
		expect(r.success).toBe(false);
		expect(r.error?.issues[0].path).toEqual(["allMethods"]);
	});

	it("null donde el contrato no lo permite (issuers, qualityFlags)", () => {
		expect(BankPromoSchema.safeParse(promo({ issuers: null as never })).success).toBe(false);
		expect(BankPromoSchema.safeParse(promo({ qualityFlags: null as never })).success).toBe(false);
	});

	it("null donde sí lo permite (cap, percentRange, regions, legalText, matchReason)", () => {
		expect(
			BankPromoSchema.safeParse(promo({ cap: null, percentRange: null, regions: null, legalText: null, matchReason: null })).success,
		).toBe(true);
	});

	it("semana: weekday fuera de 1..7 y nota de tipo desconocido", () => {
		const day = week.days[0];
		expect(BankPromoWeekSchema.safeParse({ ...week, days: [{ ...day, weekday: 0 }] }).success).toBe(false);
		expect(BankPromoWeekSchema.safeParse({ ...week, days: [{ ...day, weekday: 8 }] }).success).toBe(false);
		expect(BankPromoWeekSchema.safeParse({ ...week, notes: [{ kind: "otra", fromDate: "2026-11-05" }] }).success).toBe(false);
	});

	it("hoy: más de 3 promos no cumple el contrato de la tira", () => {
		expect(BankPromoTodaySchema.safeParse({ ...today, promos: [promo(), promo(), promo(), promo()] }).success).toBe(false);
	});

	it("mis tarjetas: un tipo de emisor que no existe", () => {
		const roto = { ...mine, methods: [{ ...mine.methods[0], issuer: { ...mine.methods[0].issuer, kind: "fintech" } }] };
		expect(MyPaymentMethodsSchema.safeParse(roto).success).toBe(false);
	});

	it("catálogo: un beneficio sin descripción", () => {
		const roto = { ...catalog, benefits: [{ slug: "jubilado", name: "Jubilado/a" }] };
		expect(PaymentCatalogSchema.safeParse(roto).success).toBe(false);
	});
});

function respuesta(status: number, cuerpo?: unknown): Response {
	return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

describe("bankPromosApi contra el backend (sin mock)", () => {
	it("GET /payment-methods/catalog y /me/payment-methods con el token", async () => {
		const fetchMock = vi.fn().mockResolvedValueOnce(respuesta(200, catalog)).mockResolvedValueOnce(respuesta(200, mine));
		vi.stubGlobal("fetch", fetchMock);
		await expect(getPaymentCatalog("T")).resolves.toEqual(catalog);
		await expect(getMyPaymentMethods("T")).resolves.toEqual(mine);
		expect(fetchMock.mock.calls[0][0]).toMatch(/\/payment-methods\/catalog$/);
		expect(fetchMock.mock.calls[1][0]).toMatch(/\/me\/payment-methods$/);
		expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer T");
	});

	it("PUT manda sólo emisor, red y tipo, y omite los vacíos", async () => {
		const fetchMock = vi.fn().mockResolvedValue(respuesta(200, mine));
		vi.stubGlobal("fetch", fetchMock);
		await savePaymentMethods("T", {
			methods: [
				{ issuerSlug: "banco-galicia", network: "visa", cardType: "credit" },
				{ issuerSlug: "mercado-pago", network: null, cardType: "wallet" },
				{ issuerSlug: "banco-nacion", network: null, cardType: null },
			],
			benefits: ["jubilado"],
		});
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toMatch(/\/me\/payment-methods$/);
		expect(init.method).toBe("PUT");
		expect(JSON.parse(init.body)).toEqual({
			methods: [
				{ issuerSlug: "banco-galicia", network: "visa", cardType: "credit" },
				{ issuerSlug: "mercado-pago", cardType: "wallet" },
				{ issuerSlug: "banco-nacion" },
			],
			benefits: ["jubilado"],
		});
	});

	it("DELETE /me/payment-methods/{id}", async () => {
		const fetchMock = vi.fn().mockResolvedValue(respuesta(204));
		vi.stubGlobal("fetch", fetchMock);
		await deletePaymentMethod("T", 42);
		expect(fetchMock.mock.calls[0][0]).toMatch(/\/me\/payment-methods\/42$/);
		expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
	});

	it("semana y hoy: query con from, mine y province (sin province no viaja)", async () => {
		const fetchMock = vi.fn().mockResolvedValueOnce(respuesta(200, week)).mockResolvedValueOnce(respuesta(200, today));
		vi.stubGlobal("fetch", fetchMock);
		await getBankPromosWeek("T", { from: "2026-11-01", mine: false, province: "CORDOBA" });
		await getBankPromosToday("T");
		expect(fetchMock.mock.calls[0][0]).toMatch(/\/bank-promotions\/week\?from=2026-11-01&mine=false&province=CORDOBA$/);
		expect(fetchMock.mock.calls[1][0]).toMatch(/\/bank-promotions\/today\?mine=true$/);
	});
});

describe("validate con estos schemas en modo strict", () => {
	it("una semana rota lanza ApiContractError con el campo", async () => {
		const { validate } = await import("../client");
		const rota = { ...week, hasPaymentMethods: "sí" };
		expect(() => validate("GET /bank-promotions/week", rota, BankPromoWeekSchema, "strict")).toThrow(ApiContractError);
	});
});
