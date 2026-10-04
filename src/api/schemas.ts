/**
 * Contrato de las respuestas del backend, en tiempo de ejecución.
 *
 * Cada schema está tipado contra el tipo generado desde openapi.json
 * (`z.ZodType<Schemas["X"]>`): si el backend agrega, quita o vuelve nulo un campo y
 * el schema no se actualiza, NO COMPILA. Y `request()` valida cada respuesta real contra
 * estos schemas, así un cambio de contrato falla con el endpoint y el campo a la vista
 * en vez de un `undefined` que rompe una pantalla más adelante.
 *
 * Al cambiar el backend: `npm run api:sync && npm run api:types`, y ajustar lo que tsc marque.
 */
import { z } from "zod";
import type { components } from "./schema";

type Schemas = components["schemas"];

const string = z.string();
const number = z.number();
const boolean = z.boolean();

// ── Usuarios y sesión ────────────────────────────────────────────────

export const UserProfileSchema: z.ZodType<Schemas["UserProfileResponse"]> = z.object({
	id: number,
	name: string,
	email: string,
	profilePicture: string.nullable(),
	address: string.nullable(),
	alternativeBrandsEnabled: boolean,
	referralCode: string.nullable(),
	points: number,
	offersPushEnabled: boolean,
	createdAt: string,
});

export const AuthResponseSchema: z.ZodType<Schemas["AuthResponse"]> = z.object({
	token: string,
	user: UserProfileSchema,
});

// ── Tickets ──────────────────────────────────────────────────────────

export const TicketItemSchema: z.ZodType<Schemas["TicketItemResponse"]> = z.object({
	id: number,
	description: string,
	rawDescription: string.nullable(),
	quantity: number,
	unitPrice: number,
	originalPrice: number.nullable(),
	subtotal: number.nullable(),
	barcode: string.nullable(),
	category: string.nullable(),
	discountAmount: number.nullable(),
	discountDescription: string.nullable(),
});

export const TicketSchema: z.ZodType<Schemas["TicketResponse"]> = z.object({
	id: number,
	storeName: string.nullable(),
	ticketId: string.nullable(),
	total: number.nullable(),
	subtotal: number.nullable(),
	totalDiscounts: number.nullable(),
	status: z.enum(["PENDING", "PROCESSED", "FAILED"]),
	reviewed: boolean,
	createdAt: string,
	items: z.array(TicketItemSchema),
});

export const TicketListSchema = z.array(TicketSchema);

export const SavingsReportSchema: z.ZodType<Schemas["SavingsReportResponse"]> = z.object({
	summary: z.object({
		totalSavings: number,
		totalSpent: number,
		ticketCount: number,
		averageSavings: number,
	}),
	byCategory: z.array(z.object({ category: string.nullable(), totalDiscounts: number, itemCount: number })),
	byStore: z.array(z.object({ storeName: string.nullable(), totalDiscounts: number, ticketCount: number })),
	timeline: z.array(z.object({ period: string, totalDiscounts: number, ticketCount: number })),
	topProducts: z.array(
		z.object({
			description: string,
			barcode: string.nullable(),
			category: string.nullable(),
			purchaseCount: number,
			totalDiscounts: number,
		}),
	),
});

// ── Puntos ───────────────────────────────────────────────────────────

export const PointsBalanceSchema: z.ZodType<Schemas["PointsBalanceResponse"]> = z.object({
	balance: number,
	referralCode: string.nullable(),
});

export const PointsHistorySchema: z.ZodType<Schemas["PointsHistoryEntryResponse"][]> = z.array(
	z.object({
		id: number,
		reason: z.enum(["REFERRAL_SIGNUP", "REFERRAL_ACTIVATED", "REFERRAL_RETAINED", "REDEEM"]),
		description: string,
		points: number,
		createdAt: string,
	}),
);

// ── Ofertas y productos recurrentes ──────────────────────────────────

const PromoMechanicSchema = z.enum(["second_unit", "3x2", "2x1", "percentage_off"]);

export const OfferSchema: z.ZodType<Schemas["Offer"]> = z.object({
	id: string,
	kind: z.enum(["catalog", "campaign"]),
	retailerSlug: string.nullable(),
	retailerName: string.nullable(),
	headline: string,
	productName: string.nullable(),
	brand: string.nullable(),
	category: string.nullable(),
	price: number.nullable(),
	listPrice: number.nullable(),
	discountPct: number.nullable(),
	imageUrl: string.nullable(),
	url: string.nullable(),
	province: string.nullable(),
	activeTo: string.nullable(),
	legalText: string.nullable(),
	percentagesUnverified: boolean,
	mechanic: PromoMechanicSchema.nullable(),
	discountPercentages: z.array(number).nullable(),
});

export const OfferFeedSchema: z.ZodType<Schemas["OfferFeedResponse"]> = z.object({
	page: number,
	pageSize: number,
	total: number,
	totalPages: number,
	items: z.array(OfferSchema),
});

const BestOfferSchema: z.ZodType<Schemas["BestOffer"]> = z.object({
	retailerName: string,
	productName: string.nullable(),
	imageUrl: string.nullable(),
	price: number,
	listPrice: number.nullable(),
	discountPct: number.nullable(),
	promoLabel: string.nullable(),
	promoLabels: z.array(string),
	requiredQuantity: number.nullable(),
	promoUnitPrice: number.nullable(),
});

const CampaignOfferSchema: z.ZodType<Schemas["CampaignOffer"]> = z.object({
	offerId: string.nullable(),
	retailerName: string,
	province: string.nullable(),
	legalText: string.nullable(),
	activeTo: string.nullable(),
	imageUrl: string.nullable(),
	discountPercentages: z.array(number),
	mechanic: PromoMechanicSchema.nullable(),
	percentagesUnverified: boolean,
});

const PromoMechanicOfferSchema: z.ZodType<Schemas["PromoMechanic"]> = z.object({
	retailerName: string,
	productName: string.nullable(),
	imageUrl: string.nullable(),
	unitPrice: number.nullable(),
	listPrice: number.nullable(),
	promoLabels: z.array(string),
	requiredQuantity: number.nullable(),
	promoUnitPrice: number.nullable(),
});

const AlternativeOfferSchema: z.ZodType<Schemas["AlternativeOffer"]> = z.object({
	productName: string,
	brand: string.nullable(),
	retailerName: string,
	price: number,
	listPrice: number.nullable(),
	discountPct: number.nullable(),
});

export const RecurringProductListSchema: z.ZodType<Schemas["RecurringProductResponse"][]> = z.array(
	z.object({
		description: string,
		barcode: string.nullable(),
		category: string.nullable(),
		purchaseCount: number,
		ticketCount: number,
		inReferenceTicket: boolean,
		totalDiscounts: number,
		lastPaidPrice: number.nullable(),
		lastPaidAt: string.nullable(),
		bestOffer: BestOfferSchema.nullable(),
		campaignOffers: z.array(CampaignOfferSchema),
		alternativeOffers: z.array(AlternativeOfferSchema),
		promoMechanics: z.array(PromoMechanicOfferSchema),
	}),
);

// ── Tiendas ──────────────────────────────────────────────────────────

export const FavoriteStoresSchema: z.ZodType<Schemas["FavoriteStoresResponse"]> = z.object({
	chainSlugs: z.array(string),
	radiusKm: number,
});

// /stores/chains y /stores/nearby reenvían la respuesta de un servicio de terceros (el localizador
// de tiendas), sin DTO propio en el backend: no están en openapi.json y su forma se declara acá.
export const StoreChainListSchema = z.array(z.object({ slug: string, name: string }));

export const NearbyStoreListSchema = z.array(
	z.object({
		chainSlug: string,
		chainName: string,
		externalId: string,
		name: string,
		address: string.nullable(),
		city: string.nullable(),
		lat: number,
		lng: number,
		distanceKm: number,
	}),
);

// ── SEPA (escaneo de códigos de barras) ──────────────────────────────

export const ProductoDetalleSchema: z.ZodType<Schemas["SepaProductoDetalleResponse"]> = z.object({
	ean: string,
	encontrado: boolean,
	sinPrecios: boolean,
	fuenteDatos: string,
	descripcion: string.nullable(),
	marca: string.nullable(),
	imagenUrl: string.nullable(),
	precioMinimo: number.nullable(),
	precioPromedio: number.nullable(),
	precioMaximo: number.nullable(),
	cantidadOfertas: number,
	fechaDataset: string.nullable(),
	comercios: z.array(
		z.object({
			comercioId: string.nullable(),
			bandera: string.nullable(),
			razonSocial: string.nullable(),
			precioMinimo: number.nullable(),
			precioMaximo: number.nullable(),
			cantidadSucursales: number,
		}),
	),
});

export const SucursalesCercanasSchema: z.ZodType<Schemas["SepaSucursalesCercanasResponse"]> = z.object({
	ean: string,
	radioKm: number,
	fechaDataset: string.nullable(),
	sucursales: z.array(
		z.object({
			comercioId: string.nullable(),
			banderaId: string.nullable(),
			bandera: string.nullable(),
			sucursalId: number,
			nombre: string.nullable(),
			tipo: string.nullable(),
			direccion: string.nullable(),
			localidad: string.nullable(),
			provincia: string.nullable(),
			latitud: number,
			longitud: number,
			distanciaKm: number,
			precio: number,
		}),
	),
});
