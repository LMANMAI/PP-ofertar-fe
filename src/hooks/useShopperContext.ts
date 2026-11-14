import { useCallback, useEffect, useState } from "react";
import { getFavoriteStores, getStoreChains } from "../services/storesApi";
import type { StoreChain } from "../services/storesApi";
import { getRecurringProducts } from "../services";
import type { RecurringProduct } from "../services";
import { ensureLocationPermission, getLocationPermission } from "../location/permission";
import { getDevicePosition, loadSearchPlaces } from "../location/searchOrigin";
import { EMPTY_PLACES, effectiveReference, type ReferenceKind } from "../location/searchPlaces";

/**
 * Where the search is centred: the reference picked in "Mis tiendas favoritas"
 * (Casa o Trabajo) if one is active, otherwise where the device is.
 */
export type Origin =
	| { status: "loading" }
	| {
			status: "ready";
			latitude: number;
			longitude: number;
			label: string | null;
			/** Cuál de las referencias es: para decir "Cerca de Casa · 3 km". */
			reference: ReferenceKind;
	  }
	/** No permission. `canAskAgain` false means only the settings can change that. */
	| { status: "denied"; canAskAgain: boolean }
	/** Permission but no position soon enough (GPS off, indoors). */
	| { status: "unavailable" };

/**
 * What the app knows about the person, needed to read a price for them: the
 * chains they picked in "Mis tiendas favoritas", how far they said "near" is,
 * where they are, and what they have bought.
 *
 * Loaded once when a scan screen opens, so the result is ready by the time
 * something is scanned. Each part fails on its own: without the favorites the
 * result falls back to every chain, without a position to the chain-level
 * prices, without the purchases it just has no history line.
 */
export type ShopperContext = {
	status: "loading" | "ready";
	chains: StoreChain[];
	favoriteSlugs: string[];
	/** Both the list of chains and the user's picks were read, so narrowing by
	 * them is meaningful. Empty picks with this true means "picked none". */
	favoritesKnown: boolean;
	/** The radius they chose in "Mis tiendas favoritas". */
	radiusKm: number;
	purchases: RecurringProduct[];
	origin: Origin;
	/** Asks for the location permission, then looks for the position. */
	askForLocation: () => void;
};

const DEFAULT_RADIUS_KM = 5;

const LOADING: Omit<ShopperContext, "askForLocation"> = {
	status: "loading",
	chains: [],
	favoriteSlugs: [],
	favoritesKnown: false,
	radiusKm: DEFAULT_RADIUS_KM,
	purchases: [],
	origin: { status: "loading" },
};

// La misma referencia que el mapa: si ahí está activa Casa, los precios más
// baratos se buscan cerca de Casa, con el mismo radio.
async function resolveOrigin(userId: number, ask: boolean): Promise<Origin> {
	const places = await loadSearchPlaces(userId).catch(() => EMPTY_PLACES);
	const { kind, place } = effectiveReference(places);
	if (place) return { status: "ready", latitude: place.latitude, longitude: place.longitude, label: place.label, reference: kind };
	const permission = ask ? await ensureLocationPermission() : await getLocationPermission();
	if (!permission.granted) return { status: "denied", canAskAgain: permission.canAskAgain };
	const position = await getDevicePosition();
	return position ? { status: "ready", ...position, label: null, reference: "current" } : { status: "unavailable" };
}

export function useShopperContext(token: string, userId: number): ShopperContext {
	const [ctx, setCtx] = useState(LOADING);

	useEffect(() => {
		let cancelled = false;
		Promise.allSettled([getStoreChains(token), getFavoriteStores(token), getRecurringProducts(token)]).then(
			([chains, favorites, purchases]) => {
				if (cancelled) return;
				setCtx((prev) => ({
					...prev,
					status: "ready",
					chains: chains.status === "fulfilled" ? chains.value : [],
					favoriteSlugs: favorites.status === "fulfilled" ? favorites.value.chainSlugs : [],
					favoritesKnown: chains.status === "fulfilled" && favorites.status === "fulfilled",
					radiusKm: favorites.status === "fulfilled" ? favorites.value.radiusKm : DEFAULT_RADIUS_KM,
					purchases: purchases.status === "fulfilled" ? purchases.value : [],
				}));
			},
		);
		// The position is resolved on its own: a slow fix must not hold back the
		// favorites, and the result screen works without it.
		resolveOrigin(userId, false).then((origin) => {
			if (!cancelled) setCtx((prev) => ({ ...prev, origin }));
		});
		return () => {
			cancelled = true;
		};
	}, [token, userId]);

	const askForLocation = useCallback(() => {
		setCtx((prev) => ({ ...prev, origin: { status: "loading" } }));
		resolveOrigin(userId, true).then((origin) => setCtx((prev) => ({ ...prev, origin })));
	}, [userId]);

	return { ...ctx, askForLocation };
}
