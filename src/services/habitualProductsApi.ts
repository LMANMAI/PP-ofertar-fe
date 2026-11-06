import { request, requestVoid } from "../api/client";
import { HabitualEansSchema } from "../api/schemas";
import type { FollowProductInput } from "./followedProductsApi";

/**
 * Sumar y sacar productos de la compra habitual desde el escáner. La compra habitual completa,
 * con lo sumado y lo detectado en los tickets, llega de getRecurringProducts.
 */

/** Solo los códigos sumados: lo que necesita el escáner para saber si el producto ya está. */
export function getHabitualEans(token: string): Promise<string[]> {
	return request("/products/habitual/eans", { token, schema: HabitualEansSchema });
}

/** Sumar uno que ya está no es un error. */
export function addHabitualProduct(token: string, product: FollowProductInput): Promise<void> {
	return requestVoid("/products/habitual", { method: "POST", token, json: product });
}

export function removeHabitualProduct(token: string, ean: string): Promise<void> {
	return requestVoid(`/products/habitual/${encodeURIComponent(ean)}`, { method: "DELETE", token });
}
