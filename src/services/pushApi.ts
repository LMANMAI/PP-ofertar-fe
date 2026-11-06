import type { components } from "../api/schema";
import { request, requestVoid } from "../api/client";
import { PushTestResultSchema } from "../api/schemas";

type Schemas = components["schemas"];

/** Qué aviso simular: lleva el mismo `data` que el real, así al tocarlo abre la misma pantalla. */
export type PushTestType = NonNullable<Schemas["PushTestRequest"]["type"]>;
/** Qué contestó Expo por cada dispositivo del usuario. `devices` vacío: no tiene ninguno registrado. */
export type PushTestResult = Schemas["PushTestResponse"];

/** Registra (o reasigna, si el dispositivo ya tenía un token de otra cuenta)
 * el Expo push token de este dispositivo contra el usuario logueado. */
export function registerPushToken(
	token: string,
	expoPushToken: string,
	platform: "ios" | "android",
): Promise<void> {
	return requestVoid("/push/register", { method: "POST", token, json: { token: expoPushToken, platform } });
}

/**
 * Le pide al backend que le mande al usuario logueado una notificación de prueba a todos sus
 * dispositivos. El backend la manda en el momento y espera la respuesta de Expo, por eso el
 * timeout. Una cada 10 s por usuario: si no, ApiError con status 429.
 */
export function sendTestPush(token: string, type: PushTestType = "test"): Promise<PushTestResult> {
	return request("/push/test", {
		method: "POST",
		token,
		json: { type },
		schema: PushTestResultSchema,
		timeoutMs: 15_000,
	});
}
