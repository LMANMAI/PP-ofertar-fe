import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";

/** A place the user picked to search stores around, instead of where they are. */
export type SearchOrigin = {
	latitude: number;
	longitude: number;
	/** What to show for it: the address they typed or the place under the pin. */
	label: string;
};

// Kept on the device: the backend stores which chains and what radius, not
// where the search is centred, and nothing else reads it. In the keychain
// (SecureStore) and not plain storage, because a place picked to shop around
// is often home. The first version wrote to AsyncStorage: that copy is read
// once, moved, and deleted.
const storageKey = (userId: number) => `ofertar.favoriteStores.origin.${userId}`;

// Rough bounds of Argentina. The stores and offers are all Argentine, so a
// geocoder answer outside this box is a homonym abroad, not what was meant.
const AR_BOUNDS = { minLat: -55.5, maxLat: -21.5, minLng: -73.8, maxLng: -53.4 };

export function isInArgentina(latitude: number, longitude: number): boolean {
	return (
		latitude >= AR_BOUNDS.minLat &&
		latitude <= AR_BOUNDS.maxLat &&
		longitude >= AR_BOUNDS.minLng &&
		longitude <= AR_BOUNDS.maxLng
	);
}

function parse(raw: string | null): SearchOrigin | null {
	if (!raw) return null;
	try {
		const value = JSON.parse(raw) as Partial<SearchOrigin>;
		if (
			typeof value.latitude !== "number" ||
			typeof value.longitude !== "number" ||
			!isInArgentina(value.latitude, value.longitude)
		) {
			return null;
		}
		return { latitude: value.latitude, longitude: value.longitude, label: value.label || "Ubicación elegida" };
	} catch {
		return null;
	}
}

export async function loadSearchOrigin(userId: number): Promise<SearchOrigin | null> {
	const key = storageKey(userId);
	try {
		const secured = parse(await SecureStore.getItemAsync(key));
		if (secured) return secured;
	} catch {
		// No keychain here (web): fall through to the legacy copy.
	}
	try {
		const legacy = parse(await AsyncStorage.getItem(key));
		if (legacy) {
			await saveSearchOrigin(userId, legacy);
			await AsyncStorage.removeItem(key);
		}
		return legacy;
	} catch {
		return null;
	}
}

export async function saveSearchOrigin(userId: number, origin: SearchOrigin): Promise<void> {
	try {
		await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(origin));
	} catch {
		// The choice still applies for this visit; it just is not remembered.
	}
}

export async function clearSearchOrigin(userId: number): Promise<void> {
	const key = storageKey(userId);
	try {
		await SecureStore.deleteItemAsync(key);
	} catch {
		// Nothing to undo if it was never stored.
	}
	try {
		await AsyncStorage.removeItem(key);
	} catch {
		// Same.
	}
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
