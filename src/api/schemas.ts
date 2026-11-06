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
		followed: boolean,
	}),
);

// ── Productos seguidos ───────────────────────────────────────────────

export const FollowedProductsSchema: z.ZodType<Schemas["FollowedProductsResponse"]> = z.object({
	promosChecked: boolean,
	items: z.array(
		z.object({
			ean: string,
			description: string,
			brand: string.nullable(),
			imageUrl: string.nullable(),
			followedAt: string,
			lastPurchasedAt: string.nullable(),
			inPromo: boolean,
			bestOffer: BestOfferSchema.nullable(),
			campaignOffers: z.array(CampaignOfferSchema),
			promoMechanics: z.array(PromoMechanicOfferSchema),
		}),
	),
});

export const FollowedEansSchema = z.array(string);

// ── Horarios de sucursales ───────────────────────────────────────────

// Cada día: [] cerrado, null no informado (o SEPA dice algo que no se entiende con certeza),
// y si no, sus franjas. Las siete claves vienen siempre. Lo interpreta utils/openingHours.
export const FranjaHorariaSchema: z.ZodType<Schemas["FranjaHorariaResponse"]> = z.object({
	desde: string,
	hasta: string,
});

const dia = z.array(FranjaHorariaSchema).nullable();

export const HorariosSchema: z.ZodType<Schemas["HorariosResponse"]> = z.object({
	lunes: dia,
	martes: dia,
	miercoles: dia,
	jueves: dia,
	viernes: dia,
	sabado: dia,
	domingo: dia,
});

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
		// Sólo en las tiendas que el backend pudo cruzar con una sucursal de SEPA; en las
		// demás la clave no viene. Sin esto zod la descartaría y nunca se vería el estado.
		horarios: HorariosSchema.nullable().optional(),
	}),
);

// ── Mis tarjetas y promos bancarias (OFT-51/52) ──────────────────────

// Endpoints nuevos del SPEC de promos bancarias (§4). El backend los hace en paralelo y todavía
// no están en openapi.json, así que acá el tipo sale del schema (`z.infer`, ver
// services/bankPromosApi.ts) y no al revés. Cuando el backend los publique: `api:sync &&
// api:types` y tipar cada uno como `z.ZodType<Schemas["…"]>`, igual que los de arriba.

/** Fecha sin hora, como la manda el backend ("2026-11-30"). */
const isoDate = string.regex(/^\d{4}-\d{2}-\d{2}$/, "fecha YYYY-MM-DD");

/** Un campo `x?` del contrato: el backend (Jackson) puede omitirlo o mandarlo en null. */
const opcional = <T extends z.ZodType>(schema: T) => schema.nullable().optional();

const IssuerKindSchema = z.enum(["bank", "wallet", "card_issuer", "club"]);
const SlugNameSchema = z.object({ slug: string, name: string });
const IssuerSchema = z.object({ slug: string, name: string, kind: IssuerKindSchema });

export const PaymentCatalogSchema = z.object({
	issuers: z.array(IssuerSchema),
	networks: z.array(SlugNameSchema),
	cardTypes: z.array(SlugNameSchema),
	benefits: z.array(z.object({ slug: string, name: string, description: string })),
});

/** GET y PUT /me/payment-methods. Sólo emisor, red y tipo: nunca números de tarjeta. */
export const MyPaymentMethodsSchema = z.object({
	methods: z.array(
		z.object({
			id: number,
			issuer: IssuerSchema,
			network: string.nullable(),
			cardType: string.nullable(),
		}),
	),
	benefits: z.array(string),
});

export const BankPromoSchema = z.object({
	id: number,
	retailer: string,
	retailerName: string,
	title: string,
	discount: z.object({
		kind: z.enum(["percent", "installments", "amount", "other"]),
		percent: opcional(number),
		installments: opcional(number),
		amount: opcional(number),
		text: string,
	}),
	cap: z.object({ amount: number, period: z.enum(["purchase", "day", "week", "month"]).nullable() }).nullable(),
	channels: z.array(z.enum(["store", "online"])),
	formats: z.array(string).nullable(),
	validFrom: isoDate,
	validTo: isoDate,
	issuers: z.array(SlugNameSchema),
	allMethods: boolean,
	requires: z.object({ network: opcional(string), cardType: opcional(string), package: opcional(string) }).nullable(),
	percentRange: z.object({ min: number, max: number }).nullable(),
	conditions: z.array(string),
	regions: z.array(string).nullable(),
	match: z.enum(["match", "near", "all", "none"]),
	matchReason: string.nullable(),
	// legal_text es NULL en la tabla del scraper: puede no haber legal.
	legalText: string.nullable(),
	qualityFlags: z.array(string),
});

export const BankPromoWeekSchema = z.object({
	from: isoDate,
	to: isoDate,
	mine: boolean,
	hasPaymentMethods: boolean,
	days: z.array(
		z.object({
			date: isoDate,
			weekday: number.int().min(1).max(7),
			bestPercent: number.nullable(),
			promos: z.array(BankPromoSchema),
		}),
	),
	notes: z.array(z.object({ kind: z.enum(["rollover"]), fromDate: isoDate })),
});

/** La tira de Inicio: como mucho 3 promos. */
export const BankPromoTodaySchema = z.object({
	date: isoDate,
	bestPercent: number.nullable(),
	promos: z.array(BankPromoSchema).max(3),
});

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
			horarios: HorariosSchema.nullable(),
		}),
	),
});

// ── Notificaciones push ──────────────────────────────────────────────

/** Los avisos que se pueden probar con POST /push/test. */
export const PushTestTypeSchema = z.enum(["test", "followedProducts", "offers", "reactivation"]);

export const PushTestResultSchema: z.ZodType<Schemas["PushTestResponse"]> = z.object({
	type: PushTestTypeSchema,
	sent: boolean,
	message: string,
	devices: z.array(
		z.object({
			platform: string,
			tokenSuffix: string,
			status: z.enum(["ok", "error"]),
			message: string.nullable(),
			error: string.nullable(),
		}),
	),
});
