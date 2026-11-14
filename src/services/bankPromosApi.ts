import type { z } from "zod";
import { request, requestVoid } from "../api/client";
import {
	BankPromoTodaySchema,
	BankPromoWeekSchema,
	MyPaymentMethodsSchema,
	PaymentCatalogSchema,
	type BankPromoSchema,
} from "../api/schemas";
import { BANK_PROMOS_MOCK } from "../constants/features";
import { bankPromosMock } from "./bankPromosMock";

/**
 * Mis tarjetas y el calendario de promos bancarias (SPEC §4, OFT-51/52).
 *
 * Sólo se manda y se guarda emisor, red y tipo de cada tarjeta: la app nunca pide el número,
 * el vencimiento ni el código. Con `EXPO_PUBLIC_BANK_PROMOS_MOCK=1` todo esto responde con los
 * datos de prueba de `bankPromosMock.ts`, que pasan por los mismos schemas.
 */

export type PaymentCatalog = z.infer<typeof PaymentCatalogSchema>;
export type CatalogIssuer = PaymentCatalog["issuers"][number];
export type CatalogOption = PaymentCatalog["networks"][number];
export type CatalogBenefit = PaymentCatalog["benefits"][number];
export type MyPaymentMethods = z.infer<typeof MyPaymentMethodsSchema>;
export type PaymentMethod = MyPaymentMethods["methods"][number];
export type BankPromo = z.infer<typeof BankPromoSchema>;
export type BankPromoMatch = BankPromo["match"];
export type BankPromoWeek = z.infer<typeof BankPromoWeekSchema>;
export type BankPromoDay = BankPromoWeek["days"][number];
export type BankPromoToday = z.infer<typeof BankPromoTodaySchema>;

/** Una tarjeta para el PUT. Red y tipo van vacíos cuando el usuario no los sabe o no aplican. */
export type PaymentMethodInput = { issuerSlug: string; network?: string | null; cardType?: string | null };
export type SavePaymentMethodsBody = { methods: PaymentMethodInput[]; benefits: string[] };

export function getPaymentCatalog(token: string): Promise<PaymentCatalog> {
	if (BANK_PROMOS_MOCK) return bankPromosMock.catalog();
	return request("/payment-methods/catalog", { token, schema: PaymentCatalogSchema });
}

export function getMyPaymentMethods(token: string): Promise<MyPaymentMethods> {
	if (BANK_PROMOS_MOCK) return bankPromosMock.getMine(token);
	return request("/me/payment-methods", { token, schema: MyPaymentMethodsSchema });
}

/** Reemplaza el conjunto completo de tarjetas y beneficios. Un slug que no está en el catálogo es un 400. */
export function savePaymentMethods(token: string, body: SavePaymentMethodsBody): Promise<MyPaymentMethods> {
	const json: SavePaymentMethodsBody = {
		// Sin red o sin tipo el campo no viaja (el contrato los declara opcionales).
		methods: body.methods.map((m) => ({
			issuerSlug: m.issuerSlug,
			...(m.network ? { network: m.network } : {}),
			...(m.cardType ? { cardType: m.cardType } : {}),
		})),
		benefits: body.benefits,
	};
	if (BANK_PROMOS_MOCK) return bankPromosMock.putMine(token, json);
	return request("/me/payment-methods", { method: "PUT", token, json, schema: MyPaymentMethodsSchema });
}

export function deletePaymentMethod(token: string, id: number): Promise<void> {
	if (BANK_PROMOS_MOCK) return bankPromosMock.deleteMine(token, id);
	return requestVoid(`/me/payment-methods/${id}`, { method: "DELETE", token });
}

export type WeekQuery = {
	/** Primer día (YYYY-MM-DD). Sin él el backend arranca hoy, en hora argentina. */
	from?: string;
	/** true: sólo lo que coincide con las tarjetas del usuario (match, all y near). */
	mine: boolean;
	/** Zona del usuario, para las promos regionales (D7). Sin ella esas promos no cuentan como match. */
	province?: string | null;
};

export function getBankPromosWeek(token: string, query: WeekQuery): Promise<BankPromoWeek> {
	if (BANK_PROMOS_MOCK) return bankPromosMock.week(token, query);
	return request("/bank-promotions/week", {
		token,
		query: { from: query.from, mine: query.mine, province: query.province },
		schema: BankPromoWeekSchema,
	});
}

/** Lo de hoy con las tarjetas del usuario, para la tira de Inicio (como mucho 3 promos). */
export function getBankPromosToday(token: string, province?: string | null): Promise<BankPromoToday> {
	if (BANK_PROMOS_MOCK) return bankPromosMock.today(token, province);
	return request("/bank-promotions/today", {
		token,
		query: { mine: true, province },
		schema: BankPromoTodaySchema,
	});
}
