import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";

const TOKEN_KEY = "ofertar_biometric_token";
const PREF_KEY = "ofertar_biometric_pref";
const DISMISSED_KEY = "ofertar_biometric_dismissed";

export async function storeToken(token: string): Promise<void> {
	await SecureStore.setItemAsync(TOKEN_KEY, token, {
		requireAuthentication: false,
	});
}

export async function getStoredToken(): Promise<string | null> {
	return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearStoredToken(): Promise<void> {
	await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getBiometricPreference(): Promise<boolean> {
	const value = await SecureStore.getItemAsync(PREF_KEY);
	return value === "true";
}

export async function setBiometricPreference(enabled: boolean): Promise<void> {
	if (enabled) {
		await SecureStore.setItemAsync(PREF_KEY, "true");
	} else {
		await SecureStore.deleteItemAsync(PREF_KEY);
		await SecureStore.deleteItemAsync(TOKEN_KEY);
	}
}

export async function isBiometricAvailable(): Promise<boolean> {
	const hasHardware = await LocalAuthentication.hasHardwareAsync();
	if (!hasHardware) return false;
	const isEnrolled = await LocalAuthentication.isEnrolledAsync();
	return isEnrolled;
}

export async function getPromptDismissed(): Promise<boolean> {
	const value = await SecureStore.getItemAsync(DISMISSED_KEY);
	return value === "true";
}

export async function setPromptDismissed(): Promise<void> {
	await SecureStore.setItemAsync(DISMISSED_KEY, "true");
}
