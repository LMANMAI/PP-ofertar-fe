import { API_BASE_URL } from "../config";

async function parseApiError(res: Response): Promise<string> {
	try {
		const json = await res.json();
		if (json.message && typeof json.message === "string") {
			return json.message;
		}
		return `Error del servidor (${res.status})`;
	} catch {
		return `Error del servidor (${res.status})`;
	}
}

/** Registra (o reasigna, si el dispositivo ya tenía un token de otra cuenta)
 * el Expo push token de este dispositivo contra el usuario logueado. */
export async function registerPushToken(
	token: string,
	expoPushToken: string,
	platform: "ios" | "android",
): Promise<void> {
	const res = await fetch(`${API_BASE_URL}/push/register`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ token: expoPushToken, platform }),
	});

	if (!res.ok) throw new Error(await parseApiError(res));
}
