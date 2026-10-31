import type { components } from "../api/schema";
import { request, requestVoid } from "../api/client";
import { FollowedEansSchema, FollowedProductsSchema } from "../api/schemas";
import { displayProductName } from "../utils/productName";

type Schemas = components["schemas"];

/** Los productos que el usuario sigue, con las promos que tienen ahora. */
export type FollowedProducts = Schemas["FollowedProductsResponse"];
export type FollowedProduct = Schemas["FollowedProductResponse"];

/**
 * Lo que se guarda de un producto escaneado al seguirlo: el código tal como lo devolvió la
 * consulta y el nombre ya prolijo, que es el que después se ve en la lista y en la notificación.
 */
export type FollowProductInput = {
	ean: string;
	description: string;
	brand: string | null;
};

/**
 * Consulta las promos en el momento, así que tarda lo que tarde el servicio de ofertas. Si ese
 * servicio no responde la lista llega igual con `promosChecked: false`: ahí `inPromo: false`
 * significa "no pudimos consultar", no "no tiene promo".
 */
export async function getFollowedProducts(token: string): Promise<FollowedProducts> {
	const followed: FollowedProducts = await request("/products/followed", { token, schema: FollowedProductsSchema });
	// Los nombres del catálogo de cada cadena pasan por el mismo arreglo que en productos
	// recurrentes; el del producto seguido ya se guardó prolijo.
	return {
		...followed,
		items: followed.items.map((p) => ({
			...p,
			bestOffer: p.bestOffer && {
				...p.bestOffer,
				productName: p.bestOffer.productName && displayProductName(p.bestOffer.productName),
			},
			promoMechanics: p.promoMechanics.map((m) => ({
				...m,
				productName: m.productName && displayProductName(m.productName),
			})),
		})),
	};
}

/** Solo los códigos, sin consultar promos: lo que necesita el escáner para saber si ya lo seguís. */
export function getFollowedEans(token: string): Promise<string[]> {
	return request("/products/followed/eans", { token, schema: FollowedEansSchema });
}

/** Seguir uno que ya se sigue no es un error. */
export function followProduct(token: string, product: FollowProductInput): Promise<void> {
	return requestVoid("/products/followed", { method: "POST", token, json: product });
}

export function unfollowProduct(token: string, ean: string): Promise<void> {
	return requestVoid(`/products/followed/${encodeURIComponent(ean)}`, { method: "DELETE", token });
}
