import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { registerPushToken } from "../services";

export type PushRegistrationResult = "granted" | "denied" | "unsupported";

/**
 * Requests push permission (if not already granted) and, once granted,
 * fetches this device's Expo push token and tells the backend about it.
 *
 * `requestPermission: false` is used on boot — only register silently when
 * the OS already granted permission in a past session; never interrupt the
 * user with a system prompt they didn't ask for. The Profile toggle passes
 * `true` since turning it on *is* the explicit ask.
 *
 * Returns `"unsupported"` on simulators/web (no real push token to fetch),
 * `"denied"` when the OS permission is missing (and the caller asked), and
 * `"granted"` once the token was registered with the backend.
 */
export async function registerForPushNotifications(
	sessionToken: string,
	{ requestPermission }: { requestPermission: boolean },
): Promise<PushRegistrationResult> {
	// Simulators and the web preview have no real push token to fetch.
	if (!Device.isDevice) return "unsupported";

	const current = await Notifications.getPermissionsAsync();
	let status = current.status;
	if (status !== "granted" && requestPermission) {
		const requested = await Notifications.requestPermissionsAsync();
		status = requested.status;
	}
	if (status !== "granted") return "denied";

	const projectId = Constants.expoConfig?.extra?.eas?.projectId;
	const expoPushToken = await Notifications.getExpoPushTokenAsync(
		projectId ? { projectId } : undefined,
	);

	await registerPushToken(sessionToken, expoPushToken.data, Platform.OS === "ios" ? "ios" : "android");
	return "granted";
}
