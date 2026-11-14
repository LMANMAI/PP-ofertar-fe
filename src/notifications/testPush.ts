import { ApiContractError, ApiError } from "../api/client";
import { sendTestPush, type PushTestType } from "../services/pushApi";
import type { PushRegistrationResult } from "./pushRegistration";

/** Lo que se le muestra al usuario después de pedir una notificación de prueba. */
export type TestPushOutcome =
	| { kind: "sent"; message: string }
	| { kind: "noDevices"; message: string }
	| { kind: "failed"; message: string }
	| { kind: "rateLimited"; message: string }
	| { kind: "error"; message: string };

/** Igual que el tope del backend: una prueba cada 10 s por usuario. */
export const TEST_PUSH_COOLDOWN_MS = 10_000;

export const TEST_PUSH_MESSAGES = {
	sent: "Te mandamos una notificación de prueba. Puede tardar unos segundos.",
	noDevices:
		"No tenés ningún teléfono registrado para notificaciones. Activá las alertas de ofertas (si ya están activas, apagalas y volvé a prenderlas) y probá de nuevo.",
	failed: "No pudimos entregar la notificación de prueba. Probá apagar y prender las alertas de ofertas.",
	rateLimited: "Esperá unos segundos antes de probar de nuevo",
	timeout: "El servidor tardó demasiado en responder. Probá de nuevo en un rato.",
	offline: "No hay conexión. Revisá tu internet y probá de nuevo.",
	generic: "No pudimos mandar la notificación de prueba. Probá de nuevo en un rato.",
	denied: "Permití las notificaciones de OfertAR en los ajustes del teléfono y probá de nuevo.",
	unsupported: "Las notificaciones no están disponibles en este dispositivo.",
	expoGo: "Requiere la app instalada: no funciona en Expo Go.",
} as const;

/**
 * Pide la notificación de prueba y traduce el resultado a un mensaje para la pantalla. Nunca
 * lanza: cualquier error termina en `{ kind: "error" }` con un mensaje entendible.
 *
 * `rateLimited` y las respuestas del servidor arrancan el cooldown de la pantalla; `error`
 * (sin conexión, timeout) no, porque el pedido puede no haber llegado.
 */
export async function requestTestPush(sessionToken: string, type: PushTestType = "test"): Promise<TestPushOutcome> {
	try {
		const result = await sendTestPush(sessionToken, type);
		if (result.devices.length === 0) return { kind: "noDevices", message: TEST_PUSH_MESSAGES.noDevices };
		if (result.sent) return { kind: "sent", message: TEST_PUSH_MESSAGES.sent };
		return { kind: "failed", message: TEST_PUSH_MESSAGES.failed };
	} catch (err) {
		if (err instanceof ApiError) {
			if (err.status === 429) return { kind: "rateLimited", message: TEST_PUSH_MESSAGES.rateLimited };
			if (err.kind === "timeout") return { kind: "error", message: TEST_PUSH_MESSAGES.timeout };
			return { kind: "error", message: TEST_PUSH_MESSAGES.generic };
		}
		if (err instanceof ApiContractError) return { kind: "error", message: TEST_PUSH_MESSAGES.generic };
		// fetch rechaza con TypeError cuando no hay red.
		if (err instanceof TypeError) return { kind: "error", message: TEST_PUSH_MESSAGES.offline };
		return { kind: "error", message: TEST_PUSH_MESSAGES.generic };
	}
}

/**
 * Lo que hace el botón de prueba: primero se asegura de que este teléfono esté registrado
 * (pide el permiso si falta y manda el token al backend), y recién ahí pide la prueba. Así el
 * botón no depende del switch de alertas ni de que el registro del arranque haya salido bien.
 *
 * `ensureDevice` es `registerForPushNotifications` con `requestPermission: true`; se recibe
 * por parámetro para no cargar módulos nativos en los tests.
 */
export async function runTestPush(
	sessionToken: string,
	ensureDevice: () => Promise<PushRegistrationResult>,
	type: PushTestType = "test",
): Promise<TestPushOutcome> {
	let registration: PushRegistrationResult;
	try {
		registration = await ensureDevice();
	} catch {
		// No pudimos registrar el token: igual se prueba, por si ya estaba registrado.
		registration = "granted";
	}
	if (registration !== "granted") return { kind: "error", message: TEST_PUSH_MESSAGES[registration] };
	return requestTestPush(sessionToken, type);
}

/** Si la respuesta (o el 429) llegó del servidor, corre el cooldown visual. */
export function startsCooldown(outcome: TestPushOutcome): boolean {
	return outcome.kind !== "error";
}
