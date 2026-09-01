import * as Location from "expo-location";

export type LocationPermission = {
	granted: boolean;
	/** False once the OS stops showing the dialog — the user has to go to
	 * settings, so asking again is a no-op that silently looks like a denial. */
	canAskAgain: boolean;
};

const DENIED: LocationPermission = { granted: false, canAskAgain: true };

/**
 * What the OS already knows, without showing anything to the user.
 */
export async function getLocationPermission(): Promise<LocationPermission> {
	try {
		const current = await Location.getForegroundPermissionsAsync();
		return { granted: current.granted, canAskAgain: current.canAskAgain };
	} catch {
		return DENIED;
	}
}

/**
 * Grants-or-asks, in that order.
 *
 * The permission is requested during registration and needed again by the
 * favourite-stores map. Checking the current state first means a user who
 * already said yes is never asked a second time, while one who said no — or
 * skipped — still gets the prompt where the radius search actually depends on
 * it.
 */
export async function ensureLocationPermission(): Promise<LocationPermission> {
	const current = await getLocationPermission();
	if (current.granted || !current.canAskAgain) return current;
	try {
		const asked = await Location.requestForegroundPermissionsAsync();
		return { granted: asked.granted, canAskAgain: asked.canAskAgain };
	} catch {
		return DENIED;
	}
}
