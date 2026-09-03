const BACKEND_URL = "https://ofertar-backend-ofertar-backend.qr2vg3.easypanel.host";

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

export interface FavoriteStores {
	chainSlugs: string[];
	radiusKm: number;
}

async function authedGet<T>(path: string, token: string): Promise<T> {
	const res = await fetch(`${BACKEND_URL}${path}`, {
		method: "GET",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
	});
	if (!res.ok) {
		const error = await res.json().catch(() => ({ message: "Error desconocido" }));
		throw new Error(error.message || `Error ${res.status}`);
	}
	return res.json();
}

export function getStoreChains(token: string): Promise<StoreChain[]> {
	return authedGet<StoreChain[]>("/stores/chains", token);
}

export function getNearbyStores(
	token: string,
	lat: number,
	lng: number,
	radiusKm: number,
	onlyFavorites = false,
): Promise<NearbyStore[]> {
	const params = new URLSearchParams({
		lat: String(lat),
		lng: String(lng),
		radiusKm: String(radiusKm),
	});
	if (onlyFavorites) params.append("onlyFavorites", "true");
	return authedGet<NearbyStore[]>(`/stores/nearby?${params}`, token);
}

export function getFavoriteStores(token: string): Promise<FavoriteStores> {
	return authedGet<FavoriteStores>("/stores/favorites", token);
}

export async function updateFavoriteStores(
	token: string,
	data: { chainSlugs?: string[]; radiusKm?: number },
): Promise<FavoriteStores> {
	const res = await fetch(`${BACKEND_URL}/stores/favorites`, {
		method: "PUT",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
		body: JSON.stringify(data),
	});
	if (!res.ok) {
		const error = await res.json().catch(() => ({ message: "Error desconocido" }));
		throw new Error(error.message || `Error ${res.status}`);
	}
	return res.json();
}
