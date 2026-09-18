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

// Puntos por referidos: quién gana qué y cuándo. Antes era un solo número
// (20 pts) que solo se acreditaba a quien se registraba con un código — el
// que invitaba nunca ganaba nada, así que "referí y ganá" no era cierto, y
// el texto de condiciones ("necesitás X referidos") tampoco tenía sentido
// (referirte a vos mismo varias veces no es algo que pueda pasar). Con
// backend real esto se separa en tres eventos, cada uno con su propio motivo
// en el historial de puntos (ver PointsReason en src/services/pointsApi.ts):
//
// 1) REFERRAL_SIGNUP — quien se registra con un código ajeno gana esto al
//    toque. Es un gesto de bienvenida, no depende de que haga nada más.
export const POINTS_REFERRED_SIGNUP = 20;

// 2) REFERRAL_ACTIVATED — quien invitó gana esto cuando la persona referida
//    escanea su primer ticket (dentro de los 30 días de registrarse). Se
//    paga más que el bono de bienvenida porque activar un usuario real es lo
//    que le sirve a la app — una cuenta que se registra y nunca vuelve no le
//    cuesta nada al negocio pero tampoco le suma nada al que invitó.
export const POINTS_REFERRER_ACTIVATION = 50;

// 3) REFERRAL_RETAINED — bono extra para quien invitó si esa misma persona
//    sigue usando la app 30 días después de registrarse (por ejemplo, un
//    segundo ticket escaneado en un mes distinto al de alta). Sin este bono,
//    a alguien le convendría invitar cuentas que activan una vez y nunca
//    vuelven — casi tan barato de fabricar como una cuenta fantasma. Atarlo
//    a retención hace que "referir bien" (a gente que realmente va a usar la
//    app) valga más que referir cantidad.
export const POINTS_REFERRER_RETENTION = 30;

// Tope anti-abuso: cuántas activaciones por mes le cuentan a una misma
// cuenta que invita. Sin este tope, alguien que fabrique altas (o compre
// referidos) podría acumular puntos sin techo; con el tope, el peor caso de
// pasivo por usuario queda acotado y calculable.
export const REFERRAL_MONTHLY_CAP = 15;

/** @deprecated Usar POINTS_REFERRED_SIGNUP / POINTS_REFERRER_ACTIVATION /
 * POINTS_REFERRER_RETENTION — se mantiene solo para no romper importaciones
 * viejas mientras se termina de migrar. */
export const POINTS_PER_REFERRAL = POINTS_REFERRED_SIGNUP;

// OfertAR todavía no tiene suscripción paga ni facturación real (ver
// PRODUCT.md — es un proyecto académico sin backend de pagos). Este catálogo
// es una vista previa de a qué se podrían canjear los puntos el día que esa
// función exista: la copy va en condicional a propósito, para no afirmar un
// mecanismo que hoy no puede pasar.
//
// El valor en pesos de cada canje está atado al precio real de Premium
// (6900 ARS/mes, ver Supuestos del modelo económico) y el costo en puntos
// se fijó para que el valor por punto sea parecido en los tres escalones
// (~3,45–4,06 ARS/pt) — antes saltaba de 3,45 a 11,5 ARS/pt entre el primer
// y el último canje, lo cual no tenía una razón de negocio clara.
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
			`Necesitás que ${Math.ceil(100 / POINTS_REFERRER_ACTIVATION)} amigos referidos activen su cuenta (escaneen su primer ticket) para desbloquearlo.`,
			"Es un adelanto de la función, todavía no se puede canjear de verdad.",
		],
	},
	{
		id: "descuento-grande",
		icon: "pricetags-outline",
		title: "20% en tu próxima suscripción",
		brand: "OfertAR",
		points: 350,
		validity: "Vista previa — todavía no hay suscripción paga en OfertAR",
		where: "Se aplicaría a tu cuenta cuando la suscripción esté disponible",
		howTo: "Se descontaría de tu próximo cobro",
		conditions: [
			`Necesitás que ${Math.ceil(350 / POINTS_REFERRER_ACTIVATION)} amigos referidos activen su cuenta (escaneen su primer ticket) para desbloquearlo.`,
			"Es un adelanto de la función, todavía no se puede canjear de verdad.",
		],
	},
	{
		id: "mes-gratis",
		icon: "gift-outline",
		title: "1 mes gratis de suscripción",
		brand: "OfertAR",
		points: 1700,
		validity: "Vista previa — todavía no hay suscripción paga en OfertAR",
		where: "Se aplicaría a tu cuenta cuando la suscripción esté disponible",
		howTo: "Se saltearía tu próximo cobro",
		conditions: [
			`Necesitás que ${Math.ceil(1700 / POINTS_REFERRER_ACTIVATION)} amigos referidos activen su cuenta (escaneen su primer ticket) para desbloquearlo — menos si además se quedan 30 días y suman el bono de retención.`,
			"Es un adelanto de la función, todavía no se puede canjear de verdad.",
		],
	},
];
