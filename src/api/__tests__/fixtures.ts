/**
 * Respuestas de ejemplo con la forma exacta del contrato. Están tipadas contra los tipos
 * generados de openapi.json: si el backend cambia un campo y el schema se actualiza, estos
 * ejemplos dejan de compilar hasta que se pongan al día.
 */
import type { components } from "../schema";

type S = components["schemas"];

export const userProfile = {
	id: 7,
	name: "Ana Test",
	email: "ana@test.com",
	profilePicture: null,
	address: null,
	alternativeBrandsEnabled: true,
	referralCode: "ANA12345",
	points: 120,
	offersPushEnabled: true,
	createdAt: "2026-09-25T20:00:00",
} satisfies S["UserProfileResponse"];

export const authResponse = { token: "jwt.token.aca", user: userProfile } satisfies S["AuthResponse"];

export const ticket = {
	id: 31,
	storeName: "Carrefour",
	ticketId: null,
	total: 15230.5,
	subtotal: null,
	totalDiscounts: 500,
	status: "PROCESSED",
	reviewed: false,
	createdAt: "2026-09-25T21:10:00",
	items: [
		{
			id: 1,
			description: "LECHE ENTERA 1L",
			rawDescription: "LECHE ENT 1L",
			quantity: 2,
			unitPrice: 1899,
			originalPrice: null,
			subtotal: 3798,
			barcode: "7791337007253",
			category: null,
			discountAmount: null,
			discountDescription: null,
		},
	],
} satisfies S["TicketResponse"];

export const savingsReport = {
	summary: { totalSavings: 500, totalSpent: 15230.5, ticketCount: 1, averageSavings: 500 },
	byCategory: [{ category: null, totalDiscounts: 500, itemCount: 1 }],
	byStore: [{ storeName: "Carrefour", totalDiscounts: 500, ticketCount: 1 }],
	timeline: [{ period: "2026-09", totalDiscounts: 500, ticketCount: 1 }],
	topProducts: [{ description: "LECHE ENTERA 1L", barcode: null, category: null, purchaseCount: 1, totalDiscounts: 500 }],
} satisfies S["SavingsReportResponse"];

export const pointsBalance = { balance: 120, referralCode: null } satisfies S["PointsBalanceResponse"];

export const pointsHistory = [
	{ id: 1, reason: "REFERRAL_SIGNUP", description: "Te registraste con un código", points: 50, createdAt: "2026-09-25T20:00:00" },
] satisfies S["PointsHistoryEntryResponse"][];

export const offerFeed = {
	page: 1,
	pageSize: 30,
	total: 1,
	totalPages: 1,
	items: [
		{
			id: "campaign:123",
			kind: "campaign",
			retailerSlug: "carrefour",
			retailerName: "Carrefour",
			headline: "50% en la 2da unidad",
			productName: null,
			brand: null,
			category: null,
			price: null,
			listPrice: null,
			discountPct: null,
			imageUrl: null,
			url: null,
			province: null,
			activeTo: "2026-09-30T23:59:00",
			legalText: null,
			percentagesUnverified: false,
			mechanic: "second_unit",
			discountPercentages: [50],
		},
	],
} satisfies S["OfferFeedResponse"];

export const recurringProducts = [
	{
		description: "LECHE ENTERA 1L",
		barcode: "7791337007253",
		category: null,
		purchaseCount: 3,
		ticketCount: 3,
		inReferenceTicket: true,
		totalDiscounts: 0,
		lastPaidPrice: 1899,
		lastPaidAt: "2026-09-20T10:00:00",
		bestOffer: {
			retailerName: "Coto",
			productName: "Leche entera La Serenísima 1L",
			imageUrl: null,
			price: 1500,
			listPrice: 1899,
			discountPct: 21,
			promoLabel: null,
			promoLabels: [],
			requiredQuantity: null,
			promoUnitPrice: null,
		},
		campaignOffers: [],
		alternativeOffers: [],
		promoMechanics: [],
		followed: true,
	},
] satisfies S["RecurringProductResponse"][];

export const followedProducts = {
	promosChecked: true,
	items: [
		{
			ean: "7790895000997",
			description: "Gaseosa Coca Cola 2.25 L",
			brand: "Coca Cola",
			imageUrl: null,
			followedAt: "2026-10-07T20:20:41",
			lastPurchasedAt: "2026-10-12T18:05:00",
			inPromo: true,
			bestOffer: null,
			campaignOffers: [],
			promoMechanics: [
				{
					retailerName: "Coto",
					productName: "Gaseosa Coca Cola 2.25 l",
					imageUrl: null,
					unitPrice: 3500,
					listPrice: null,
					promoLabels: ["3x2"],
					requiredQuantity: 3,
					promoUnitPrice: 2333.33,
				},
			],
		},
	],
} satisfies S["FollowedProductsResponse"];

export const favoriteStores = { chainSlugs: ["carrefour"], radiusKm: 5 } satisfies S["FavoriteStoresResponse"];

export const productoDetalle = {
	ean: "7791337007253",
	encontrado: false,
	sinPrecios: true,
	fuenteDatos: "ninguna",
	descripcion: null,
	marca: null,
	imagenUrl: null,
	precioMinimo: null,
	precioPromedio: null,
	precioMaximo: null,
	cantidadOfertas: 0,
	fechaDataset: null,
	comercios: [],
} satisfies S["SepaProductoDetalleResponse"];

/** Una semana con los tres estados de un día: franjas (una o dos, por turno partido, o que
 * cruzan la medianoche), [] cerrado y null no informado. */
export const horarios = {
	lunes: [{ desde: "08:00", hasta: "22:00" }],
	martes: [
		{ desde: "08:30", hasta: "13:00" },
		{ desde: "16:00", hasta: "20:30" },
	],
	miercoles: [],
	jueves: null,
	viernes: [{ desde: "00:00", hasta: "24:00" }],
	sabado: [{ desde: "18:00", hasta: "02:00" }],
	domingo: null,
} satisfies S["HorariosResponse"];

export const sucursalesCercanas = {
	ean: "7791337007253",
	radioKm: 5,
	fechaDataset: "2026-09-15",
	sucursales: [
		{
			comercioId: "10",
			banderaId: "1",
			bandera: "Jumbo",
			sucursalId: 12,
			nombre: null,
			tipo: null,
			direccion: "Av. Siempreviva 742",
			localidad: null,
			provincia: "AR-C",
			latitud: -34.6,
			longitud: -58.4,
			distanciaKm: 1.2,
			precio: 2499,
			horarios,
		},
		{
			comercioId: "15",
			banderaId: "1",
			bandera: "DIA",
			sucursalId: 87,
			nombre: null,
			tipo: null,
			direccion: "Av. Corrientes 1234",
			localidad: null,
			provincia: "AR-C",
			latitud: -34.6,
			longitud: -58.38,
			distanciaKm: 2.4,
			precio: 2550,
			// SEPA no informa ningún día: va null, no un objeto con siete null.
			horarios: null,
		},
	],
} satisfies S["SepaSucursalesCercanasResponse"];

/** /stores/nearby no está en openapi.json (reenvía al localizador de tiendas): la forma es la
 * de NearbyStoreListSchema. `horarios` sólo viene en las que se cruzaron con SEPA. */
export const nearbyStores = [
	{
		chainSlug: "jumbo",
		chainName: "Jumbo",
		externalId: "j-12",
		name: "Jumbo Palermo",
		address: "Av. Siempreviva 742",
		city: "CABA",
		lat: -34.6,
		lng: -58.4,
		distanceKm: 1.2,
		horarios,
	},
	{
		chainSlug: "dia",
		chainName: "DIA",
		externalId: "d-87",
		name: "DIA Corrientes",
		address: null,
		city: null,
		lat: -34.6,
		lng: -58.38,
		distanceKm: 2.4,
	},
];
