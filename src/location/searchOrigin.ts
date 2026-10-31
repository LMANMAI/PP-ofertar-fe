import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import {
	isInArgentina,
	loadPlacesFrom,
	savePlacesTo,
	type PlacesStorage,
	type SearchOrigin,
	type SearchPlaces,
} from "./searchPlaces";

export { isInArgentina };
export type { SearchOrigin };

// Casa y Trabajo viven en el dispositivo: el backend guarda qué cadenas y qué
// radio, no dónde se centra la búsqueda, y nada más los lee. En el llavero
// (SecureStore) y no en almacenamiento plano porque un lugar elegido para
// comprar suele ser tu casa. La lógica (y la migración del punto único de la
// versión anterior) está en `searchPlaces.ts`; acá sólo se conecta a Expo.
const storage: PlacesStorage = {
	secure: {
		get: (key) => SecureStore.getItemAsync(key),
		set: (key, value) => SecureStore.setItemAsync(key, value),
		remove: (key) => SecureStore.deleteItemAsync(key),
	},
	legacy: {
		get: (key) => AsyncStorage.getItem(key),
		set: (key, value) => AsyncStorage.setItem(key, value),
		remove: (key) => AsyncStorage.removeItem(key),
	},
};

export function loadSearchPlaces(userId: number): Promise<SearchPlaces> {
	return loadPlacesFrom(storage, userId);
}

export function saveSearchPlaces(userId: number, places: SearchPlaces): Promise<boolean> {
	return savePlacesTo(storage, userId, places);
}

/**
 * Where the device is, or null if it cannot say soon enough. A recent known
 * position is used at once; otherwise a fix is waited for, but not forever:
 * without a limit a weak GPS kept the screen waiting on it.
 */
export async function getDevicePosition(timeoutMs = 8000): Promise<{ latitude: number; longitude: number } | null> {
	try {
		const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
		if (last) return { latitude: last.coords.latitude, longitude: last.coords.longitude };
		const fix = await Promise.race([
			Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
			new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
		]);
		return fix ? { latitude: fix.coords.latitude, longitude: fix.coords.longitude } : null;
	} catch {
		return null;
	}
}

/**
 * The first place the device's geocoder finds for what the user typed, or null
 * when there is none in Argentina. Throws when the geocoder itself is not
 * available (no connection, or a device without one).
 *
 * Es el geocoder nativo del sistema (expo-location), no una API web de Google:
 * no usa la key de la app ni se factura. Aun así se llama sólo al confirmar
 * (`onSubmitEditing` / "Buscar"), nunca por tecla; `scripts/verifyMapsApiUsage.ts`
 * lo controla.
 */
export async function findPlace(query: string): Promise<SearchOrigin | null> {
	const text = query.trim();
	if (!text) return null;
	// Biased to Argentina: "Belgrano 1200" alone can match a street anywhere.
	const results = await Location.geocodeAsync(/argentina/i.test(text) ? text : `${text}, Argentina`);
	const hit = results.find((r) => isInArgentina(r.latitude, r.longitude));
	return hit ? { latitude: hit.latitude, longitude: hit.longitude, label: text } : null;
}

/** A readable name for a point, or null if the geocoder has none (best effort). */
export async function describePoint(latitude: number, longitude: number): Promise<string | null> {
	try {
		const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
		if (!place) return null;
		const street = [place.street, place.streetNumber].filter(Boolean).join(" ");
		const area = place.district || place.subregion || place.city;
		const label = [street || place.name, area].filter(Boolean).join(", ");
		return label || null;
	} catch {
		return null;
	}
}
