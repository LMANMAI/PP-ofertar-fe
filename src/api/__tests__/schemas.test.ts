import { describe, expect, it } from "vitest";
import {
	AuthResponseSchema,
	FavoriteStoresSchema,
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
		["ProductoDetalle", ProductoDetalleSchema, f.productoDetalle],
		["SucursalesCercanas", SucursalesCercanasSchema, f.sucursalesCercanas],
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

	it("un backend más nuevo que agrega campos no rompe a la app", () => {
		expect(UserProfileSchema.safeParse({ ...f.userProfile, campoNuevo: 1 }).success).toBe(true);
	});
});
