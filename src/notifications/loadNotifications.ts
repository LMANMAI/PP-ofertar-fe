import { isRunningInExpoGo } from "expo";

/**
 * `expo-notifications` cannot be imported in Expo Go on Android: merely
 * evaluating the module throws, because its top-level auto-registration code
 * calls `addPushTokenListener`, which in turn rejects Expo Go (SDK 53+ removed
 * remote push from Expo Go). Importing it lazily behind this guard lets the app
 * keep booting in Expo Go while still using the real module in a development
 * build.
 */
type NotificationsModule = typeof import("expo-notifications");

export function canUsePush(): boolean {
	return !isRunningInExpoGo();
}

export async function loadNotifications(): Promise<NotificationsModule | null> {
	if (isRunningInExpoGo()) return null;
	return import("expo-notifications");
}
