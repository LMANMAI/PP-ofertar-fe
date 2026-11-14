/**
 * El precio final de una promo de tarjeta o programa de la cadena (OFT-23).
 *
 * El jurado lo pidió así: en vez de un texto que obliga a hacer la cuenta, el
 * porcentaje y el precio que queda. Sólo se calcula cuando la etiqueta trae un
 * porcentaje claro. Si no, la promo queda como texto: un número inventado es
 * peor que uno que falta.
 *
 * Módulo plano para poder probarlo sin React Native.
 */
export interface PaymentPromoPrice {
	/** Por ejemplo "Tarjeta Carrefour", sin el porcentaje ni el día. */
	name: string;
	percent: number;
	/** Por ejemplo "Martes". Null si la etiqueta no dice un día. */
	day: string | null;
	/** Hay tope de reintegro: el porcentaje es un máximo y el precio, un mínimo. */
	capped: boolean;
	finalPrice: number;
}

const DAY = /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?)\b/i;
const CAP = /\b(hasta|tope|m[aá]ximo)\b/i;
const PERCENT = /(\d{1,2})\s?%/g;

function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function promoName(label: string): string {
	return label
		.replace(PERCENT, " ")
		.replace(DAY, " ")
		.replace(/\b(off|dto|desc|descuento|hasta|tope|m[aá]ximo|de|en|los|con)\b\.?/gi, " ")
		.replace(/[-–·,:!]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/** Null si la etiqueta no permite calcular sin adivinar: sin porcentaje, con
 * más de uno, o sin un precio sobre el cual aplicarlo. */
export function readPaymentPromo(label: string, price: number): PaymentPromoPrice | null {
	if (!(price > 0)) return null;
	const percents = [...label.matchAll(PERCENT)].map((m) => Number(m[1]));
	if (percents.length !== 1) return null;
	const percent = percents[0];
	if (percent <= 0) return null;

	const name = promoName(label);
	if (!name) return null;
	const day = label.match(DAY)?.[1] ?? null;

	return {
		name,
		percent,
		day: day ? capitalize(day) : null,
		capped: CAP.test(label),
		finalPrice: Math.round(price * (100 - percent)) / 100,
	};
}
