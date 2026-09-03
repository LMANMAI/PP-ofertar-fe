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

/** Puntos que gana cada usuario (el que invita y el que se registra) por
 * cada referido exitoso. */
export const POINTS_PER_REFERRAL = 20;

export const REWARDS: Reward[] = [
	{
		id: "mini-descuento",
		icon: "pricetag-outline",
		title: "5% en tu próxima suscripción",
		brand: "OfertAR",
		points: 100,
		validity: "Se aplica en tu próximo pago",
		where: "Se acredita automáticamente en tu cuenta",
		howTo: "Se descuenta solo del próximo cobro de tu suscripción",
		conditions: [
			`Necesitás ${100 / POINTS_PER_REFERRAL} referidos para desbloquearlo.`,
			"Un canje activo por vez.",
		],
	},
	{
		id: "descuento-grande",
		icon: "pricetags-outline",
		title: "20% en tu próxima suscripción",
		brand: "OfertAR",
		points: 300,
		validity: "Se aplica en tu próximo pago",
		where: "Se acredita automáticamente en tu cuenta",
		howTo: "Se descuenta solo del próximo cobro de tu suscripción",
		conditions: [
			`Necesitás ${300 / POINTS_PER_REFERRAL} referidos para desbloquearlo.`,
			"Un canje activo por vez.",
		],
	},
	{
		id: "mes-gratis",
		icon: "gift-outline",
		title: "1 mes gratis de suscripción",
		brand: "OfertAR",
		points: 600,
		validity: "Se aplica en tu próximo ciclo de facturación",
		where: "Se acredita automáticamente en tu cuenta",
		howTo: "Tu próximo cobro se salta automáticamente",
		conditions: [
			`Necesitás ${600 / POINTS_PER_REFERRAL} referidos para desbloquearlo.`,
			"Un canje activo por vez.",
		],
	},
];
