import type { OfferDetail } from "../screens/OfferDetailScreen";

export type OfferStatus = "available" | "activated" | "expired";

export type Offer = OfferDetail & {
	tone: "light" | "dark";
	category: string;
	expiresAtLabel: string;
};

export const CATEGORIES = [
	"Todas",
	"Lácteos",
	"Almacén",
	"Bebidas",
	"Limpieza",
] as const;

export const OFFERS: Offer[] = [
	{
		id: "dia-lacteos",
		storeBadge: "DI",
		storeBadgeColor: "#0D80CC",
		storeName: "Día",
		title: "20% en lácteos",
		subtitle: "La Serenísima · hasta 20 may",
		points: "+150 pts",
		tone: "light",
		category: "Lácteos",
		validity: "Válida del 10 al 20 de mayo · Supermercados Día",
		expiresAtLabel: "Vence el 20 may · 10 días restantes",
		products: [
			"Leche entera La Serenísima 1L",
			"Yogur bebible La Serenísima 900ml",
			"Crema de leche La Serenísima 200ml",
			"Queso untable La Serenísima 200g",
		],
		conditions: [
			"Descuento aplicable una vez por cuenta.",
			"Válido solo en supermercados Día.",
			"No acumulable con otras promociones.",
			"Requiere activar la oferta antes de pagar.",
		],
	},
	{
		id: "carrefour-yerbas",
		storeBadge: "CA",
		storeBadgeColor: "#0059A6",
		storeName: "Carrefour",
		title: "3x2 en yerbas",
		subtitle: "Playadito, Rosamonte · hasta 18 may",
		points: "+90 pts",
		tone: "dark",
		category: "Almacén",
		validity: "Válida del 12 al 18 de mayo · Carrefour",
		expiresAtLabel: "Vence el 18 may · 8 días restantes",
		products: ["Yerba Playadito 1kg", "Yerba Rosamonte 1kg", "Yerba Rosamonte Suave 500g"],
		conditions: [
			"Llevá 3 unidades y pagá 2.",
			"Válido en sucursales adheridas.",
			"No acumulable con otras promociones.",
		],
	},
	{
		id: "coto-almacen",
		storeBadge: "CO",
		storeBadgeColor: "#CC1A1A",
		storeName: "Coto",
		title: "10% extra en almacén",
		subtitle: "Todos los productos · venció 9 may",
		points: "+120 pts",
		tone: "light",
		category: "Almacén",
		validity: "Vigencia finalizada",
		expiresAtLabel: "Oferta vencida",
		products: ["Productos categoría almacén"],
		conditions: ["Oferta vencida"],
	},
	{
		id: "jumbo-yogur",
		storeBadge: "JU",
		storeBadgeColor: "#008040",
		storeName: "Jumbo",
		title: "2x1 en yogures",
		subtitle: "Ser, La Serenísima · hasta 22 may",
		points: "+120 pts",
		tone: "light",
		category: "Lácteos",
		validity: "Válida hasta el 22 de mayo · Jumbo",
		expiresAtLabel: "Vence el 22 may · 12 días restantes",
		products: ["Yogur Ser pack x4", "Yogur La Serenísima firme x4"],
		conditions: ["Llevá 2 packs y pagá 1.", "Solo en Jumbo."],
	},
];

export const EXPIRED_IDS = new Set<string>(["coto-almacen"]);
