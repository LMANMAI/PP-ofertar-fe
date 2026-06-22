import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

type IonName = ComponentProps<typeof Ionicons>["name"];

export type Reward = {
	id: string;
	icon: IonName;
	title: string;
	brand: string;
	points: number;
	validity: string;
	conditions: string[];
	howTo: string;
	where: string;
};

export const REWARDS: Reward[] = [
	{
		id: "dia-500",
		icon: "gift-outline",
		title: "$500 en compras",
		brand: "Día",
		points: 1000,
		validity: "30 días tras el canje",
		where: "Supermercados Día (todas las sucursales)",
		howTo: "Mostrá el código en caja antes de pagar",
		conditions: [
			"No acumulable con otras promociones.",
			"Válido para compras mayores a $5.000.",
			"Un canje por cuenta por mes.",
			"No aplica para productos de perfumería.",
		],
	},
	{
		id: "starbucks-cafe",
		icon: "cafe-outline",
		title: "Café gratis",
		brand: "Starbucks",
		points: 800,
		validity: "15 días tras el canje",
		where: "Starbucks (sucursales adheridas)",
		howTo: "Mostrá el código en barra",
		conditions: [
			"Aplica a tall (354ml).",
			"Una vez por usuario.",
		],
	},
	{
		id: "coto-10",
		icon: "pricetag-outline",
		title: "10% extra",
		brand: "Coto",
		points: 600,
		validity: "10 días tras el canje",
		where: "Coto (todas las sucursales)",
		howTo: "Mostrá el código en caja",
		conditions: [
			"No acumulable.",
			"No aplica a productos de electro.",
		],
	},
	{
		id: "rappi-envio",
		icon: "bicycle-outline",
		title: "Envío gratis",
		brand: "Rappi",
		points: 450,
		validity: "30 días",
		where: "Rappi app",
		howTo: "Usar el código al pagar el envío",
		conditions: ["Una vez por usuario."],
	},
];

export const SALDO_PUNTOS = 2430;
