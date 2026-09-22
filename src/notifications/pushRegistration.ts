import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { registerPushToken } from "../services";

/**
 * Requests push permission (if not already granted) and, once granted,
 * fetches this device's Expo push token and tells the backend about it.
 *
 * `requestPermission: false` is used on boot — only register silently when
 * the OS already granted permission in a past session; never interrupt the
 * user with a system prompt they didn't ask for. The Profile toggle passes
 * `true` since turning it on *is* the explicit ask.
 */
export async function registerForPushNotifications(
	sessionToken: string,
	{ requestPermission }: { requestPermission: boolean },
): Promise<boolean> {
	// Simulators and the web preview have no real push token to fetch.
	if (!Device.isDevice) return false;

	const current = await Notifications.getPermissionsAsync();
	let status = current.status;
	if (status !== "granted" && requestPermission) {
		const requested = await Notifications.requestPermissionsAsync();
		status = requested.status;
	}
	if (status !== "granted") return false;

	const projectId = Constants.expoConfig?.extra?.eas?.projectId;
	const expoPushToken = await Notifications.getExpoPushTokenAsync(
		projectId ? { projectId } : undefined,
	);

	await registerPushToken(sessionToken, expoPushToken.data, Platform.OS === "ios" ? "ios" : "android");
	return true;
}
