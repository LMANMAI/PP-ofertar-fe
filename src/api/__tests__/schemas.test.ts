import { describe, expect, it } from "vitest";
import {
	AuthResponseSchema,
	FavoriteStoresSchema,
	FollowedProductsSchema,
	HorariosSchema,
	NearbyStoreListSchema,
	OfferFeedSchema,
	PointsBalanceSchema,
	PointsHistorySchema,
	ProductoDetalleSchema,
	RecurringProductListSchema,
	SavingsReportSchema,
	SucursalesCercanasSchema,
	TicketListSchema,
	TicketSchema,
	UserProfileSchema,
} from "../schemas";
import * as f from "./fixtures";

describe("cada schema acepta una respuesta con la forma del contrato", () => {
	it.each([
		["UserProfile", UserProfileSchema, f.userProfile],
		["AuthResponse", AuthResponseSchema, f.authResponse],
		["Ticket", TicketSchema, f.ticket],
		["TicketList", TicketListSchema, [f.ticket]],
		["SavingsReport", SavingsReportSchema, f.savingsReport],
		["PointsBalance", PointsBalanceSchema, f.pointsBalance],
		["PointsHistory", PointsHistorySchema, f.pointsHistory],
		["OfferFeed", OfferFeedSchema, f.offerFeed],
		["RecurringProducts", RecurringProductListSchema, f.recurringProducts],
		["FavoriteStores", FavoriteStoresSchema, f.favoriteStores],
		["FollowedProducts", FollowedProductsSchema, f.followedProducts],
		["ProductoDetalle", ProductoDetalleSchema, f.productoDetalle],
		["SucursalesCercanas", SucursalesCercanasSchema, f.sucursalesCercanas],
		["Horarios", HorariosSchema, f.horarios],
		["NearbyStores", NearbyStoreListSchema, f.nearbyStores],
	] as const)("%s", (_nombre, schema, ejemplo) => {
		expect(schema.safeParse(ejemplo).success).toBe(true);
	});
});

describe("un cambio de contrato se detecta", () => {
	it("campo obligatorio ausente", () => {
		const { status: _quitado, ...sinStatus } = f.ticket;
		const r = TicketSchema.safeParse(sinStatus);
		expect(r.success).toBe(false);
		expect(r.error?.issues[0].path).toEqual(["status"]);
	});

	it("campo con otro tipo", () => {
		expect(UserProfileSchema.safeParse({ ...f.userProfile, points: "120" }).success).toBe(false);
	});

	it("null donde el contrato no lo permite (campo no nulo)", () => {
		expect(UserProfileSchema.safeParse({ ...f.userProfile, email: null }).success).toBe(false);
		expect(TicketSchema.safeParse({ ...f.ticket, items: null }).success).toBe(false);
	});

	it("null donde el contrato sí lo permite", () => {
		expect(UserProfileSchema.safeParse({ ...f.userProfile, referralCode: null }).success).toBe(true);
	});

	it("valor fuera de un enum", () => {
		expect(TicketSchema.safeParse({ ...f.ticket, status: "DELETED" }).success).toBe(false);
		const oferta = { ...f.offerFeed, items: [{ ...f.offerFeed.items[0], mechanic: "4x1" }] };
		expect(OfferFeedSchema.safeParse(oferta).success).toBe(false);
	});

	it("productos recurrentes: `followed` es obligatorio y no admite null", () => {
		const [leche] = f.recurringProducts;
		const { followed: _quitado, ...sinFollowed } = leche;
		expect(RecurringProductListSchema.safeParse([sinFollowed]).success).toBe(false);
		expect(RecurringProductListSchema.safeParse([{ ...leche, followed: null }]).success).toBe(false);
		expect(RecurringProductListSchema.safeParse([{ ...leche, followed: false }]).success).toBe(true);
	});

	it("productos seguidos: `lastPurchasedAt` viene siempre, null si nunca se compró", () => {
		const [gaseosa] = f.followedProducts.items;
		const con = (item: object) => ({ ...f.followedProducts, items: [item] });
		const { lastPurchasedAt: _quitado, ...sinFecha } = gaseosa;
		expect(FollowedProductsSchema.safeParse(con(sinFecha)).success).toBe(false);
		expect(FollowedProductsSchema.safeParse(con({ ...gaseosa, lastPurchasedAt: null })).success).toBe(true);
	});

	it("sucursales de SEPA: `horarios` viene siempre, null si no se informa ningún día", () => {
		const [jumbo] = f.sucursalesCercanas.sucursales;
		const con = (sucursal: object) => ({ ...f.sucursalesCercanas, sucursales: [sucursal] });
		const { horarios: _quitado, ...sinHorarios } = jumbo;
		expect(SucursalesCercanasSchema.safeParse(con(sinHorarios)).success).toBe(false);
		expect(SucursalesCercanasSchema.safeParse(con({ ...jumbo, horarios: null })).success).toBe(true);
	});

	it("horarios: las siete claves vienen, cada día es [] (cerrado), null (sin dato) o franjas", () => {
		const { domingo: _quitado, ...sinDomingo } = f.horarios;
		expect(HorariosSchema.safeParse(sinDomingo).success).toBe(false);
		expect(HorariosSchema.safeParse({ ...f.horarios, lunes: [] }).success).toBe(true);
		expect(HorariosSchema.safeParse({ ...f.horarios, lunes: null }).success).toBe(true);
		expect(HorariosSchema.safeParse({ ...f.horarios, lunes: [{ desde: "08:00" }] }).success).toBe(false);
		expect(HorariosSchema.safeParse({ ...f.horarios, lunes: [{ desde: 8, hasta: 22 }] }).success).toBe(false);
	});

	it("horarios no se pierde al validar (zod descarta las claves que el schema no declara)", () => {
		const sucursales = SucursalesCercanasSchema.parse(f.sucursalesCercanas).sucursales;
		expect(sucursales[0].horarios).toEqual(f.horarios);
		expect(sucursales[1].horarios).toBeNull();
		const [conHorarios, sinHorarios] = NearbyStoreListSchema.parse(f.nearbyStores);
		expect(conHorarios.horarios).toEqual(f.horarios);
		expect(sinHorarios.horarios).toBeUndefined();
	});

	it("un backend más nuevo que agrega campos no rompe a la app", () => {
		expect(UserProfileSchema.safeParse({ ...f.userProfile, campoNuevo: 1 }).success).toBe(true);
	});
});
