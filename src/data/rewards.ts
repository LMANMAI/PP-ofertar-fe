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

/** Puntos que gana el usuario que se registra usando el código de invitación
 * de otro. OfertAR no tiene backend de referidos todavía, así que solo se
 * acredita del lado de quien ingresa el código al registrarse — no hay forma
 * de avisarle al dueño del código que alguien lo usó. */
export const POINTS_PER_REFERRAL = 20;

// OfertAR todavía no tiene suscripción paga ni facturación real (ver
// PRODUCT.md — es un proyecto académico sin backend de pagos). Este catálogo
// es una vista previa de a qué se podrían canjear los puntos el día que esa
// función exista: la copy va en condicional a propósito, para no afirmar un
// mecanismo que hoy no puede pasar.
export const REWARDS: Reward[] = [
	{
		id: "mini-descuento",
		icon: "pricetag-outline",
		title: "5% en tu próxima suscripción",
		brand: "OfertAR",
		points: 100,
		validity: "Vista previa — todavía no hay suscripción paga en OfertAR",
		where: "Se aplicaría a tu cuenta cuando la suscripción esté disponible",
		howTo: "Se descontaría de tu próximo cobro",
		conditions: [
			`Necesitás ${100 / POINTS_PER_REFERRAL} referidos para desbloquearlo.`,
			"Es un adelanto de la función, todavía no se puede canjear de verdad.",
		],
	},
	{
		id: "descuento-grande",
		icon: "pricetags-outline",
		title: "20% en tu próxima suscripción",
		brand: "OfertAR",
		points: 300,
		validity: "Vista previa — todavía no hay suscripción paga en OfertAR",
		where: "Se aplicaría a tu cuenta cuando la suscripción esté disponible",
		howTo: "Se descontaría de tu próximo cobro",
		conditions: [
			`Necesitás ${300 / POINTS_PER_REFERRAL} referidos para desbloquearlo.`,
			"Es un adelanto de la función, todavía no se puede canjear de verdad.",
		],
	},
	{
		id: "mes-gratis",
		icon: "gift-outline",
		title: "1 mes gratis de suscripción",
		brand: "OfertAR",
		points: 600,
		validity: "Vista previa — todavía no hay suscripción paga en OfertAR",
		where: "Se aplicaría a tu cuenta cuando la suscripción esté disponible",
		howTo: "Se saltearía tu próximo cobro",
		conditions: [
			`Necesitás ${600 / POINTS_PER_REFERRAL} referidos para desbloquearlo.`,
			"Es un adelanto de la función, todavía no se puede canjear de verdad.",
		],
	},
];
