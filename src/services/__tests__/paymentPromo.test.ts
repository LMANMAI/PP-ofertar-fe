import { describe, expect, it } from "vitest";
import { readPaymentPromo } from "../paymentPromo";

describe("readPaymentPromo", () => {
	it("calcula el precio final de una promo con porcentaje", () => {
		expect(readPaymentPromo("Tarjeta Carrefour 15%", 1000)).toEqual({
			name: "Tarjeta Carrefour",
			percent: 15,
			day: null,
			capped: false,
			finalPrice: 850,
		});
	});

	it("separa el día y limpia el nombre", () => {
		expect(readPaymentPromo("Tarjeta Carrefour 20% Off Martes", 2500)).toEqual({
			name: "Tarjeta Carrefour",
			percent: 20,
			day: "Martes",
			capped: false,
			finalPrice: 2000,
		});
	});

	it("marca el tope cuando el porcentaje es un máximo", () => {
		const promo = readPaymentPromo("Mastercard hasta 25% Off", 1000);
		expect(promo?.capped).toBe(true);
		expect(promo?.name).toBe("Mastercard");
	});

	it("redondea a centavos", () => {
		expect(readPaymentPromo("Comunidad 15%", 1999.99)?.finalPrice).toBe(1699.99);
	});

	it("no calcula sin un porcentaje claro", () => {
		expect(readPaymentPromo("Miembros Comunidad", 1000)).toBeNull();
		expect(readPaymentPromo("Visa 20% y Naranja 30%", 1000)).toBeNull();
		expect(readPaymentPromo("0%", 1000)).toBeNull();
	});

	it("no calcula sin precio", () => {
		expect(readPaymentPromo("Tarjeta Carrefour 15%", 0)).toBeNull();
	});
});
