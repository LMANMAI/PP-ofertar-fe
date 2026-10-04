import type { components } from "../api/schema";
import { request } from "../api/client";
import { FavoriteStoresSchema, NearbyStoreListSchema, StoreChainListSchema } from "../api/schemas";

export interface StoreChain {
	slug: string;
	name: string;
}

export interface NearbyStore {
	chainSlug: string;
	chainName: string;
	externalId: string;
	name: string;
	address: string | null;
	city: string | null;
	lat: number;
	lng: number;
	distanceKm: number;
}

export type FavoriteStores = components["schemas"]["FavoriteStoresResponse"];

export function getStoreChains(token: string): Promise<StoreChain[]> {
	return request("/stores/chains", { token, schema: StoreChainListSchema });
}

export function getNearbyStores(
	token: string,
	lat: number,
	lng: number,
	radiusKm: number,
	onlyFavorites = false,
): Promise<NearbyStore[]> {
	return request("/stores/nearby", {
		token,
		query: { lat, lng, radiusKm, onlyFavorites: onlyFavorites ? true : undefined },
		schema: NearbyStoreListSchema,
	});
}

export function getFavoriteStores(token: string): Promise<FavoriteStores> {
	return request("/stores/favorites", { token, schema: FavoriteStoresSchema });
}

export function updateFavoriteStores(
	token: string,
	data: { chainSlugs?: string[]; radiusKm?: number },
): Promise<FavoriteStores> {
	return request("/stores/favorites", { method: "PUT", token, json: data, schema: FavoriteStoresSchema });
}
