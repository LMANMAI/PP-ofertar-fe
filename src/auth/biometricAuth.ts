import { useEffect, useState } from "react";
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

export type BiometricInfo = {
	/** Noun phrase for copy ("Usá {hint} para ingresar"). */
	hint: string;
	icon: "finger-print-outline" | "scan-outline";
};

const DEFAULT_BIOMETRIC_INFO: BiometricInfo = { hint: "tu biometría", icon: "finger-print-outline" };

/** What to call the device's biometric in copy and which icon to show:
 * iPhones with Face ID have no fingerprint, so "huella" would be wrong there. */
export async function getBiometricInfo(): Promise<BiometricInfo> {
	const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
	if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
		return { hint: "Face ID", icon: "scan-outline" };
	}
	if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
		return { hint: "tu huella", icon: "finger-print-outline" };
	}
	return DEFAULT_BIOMETRIC_INFO;
}

export function useBiometricInfo(): BiometricInfo {
	const [info, setInfo] = useState<BiometricInfo>(DEFAULT_BIOMETRIC_INFO);
	useEffect(() => {
		getBiometricInfo().then(setInfo).catch(() => {});
	}, []);
	return info;
}
