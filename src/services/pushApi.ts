import { requestVoid } from "../api/client";

/** Registra (o reasigna, si el dispositivo ya tenía un token de otra cuenta)
 * el Expo push token de este dispositivo contra el usuario logueado. */
export function registerPushToken(
	token: string,
	expoPushToken: string,
	platform: "ios" | "android",
): Promise<void> {
	return requestVoid("/push/register", { method: "POST", token, json: { token: expoPushToken, platform } });
}
