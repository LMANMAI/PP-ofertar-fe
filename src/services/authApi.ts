import type { components } from "../api/schema";
import { request, requestVoid } from "../api/client";
import { AuthResponseSchema, UserProfileSchema } from "../api/schemas";

/** Perfil del usuario. `points` es el saldo actual (fuente de verdad: backend, ver
 * src/services/pointsApi.ts); `referralCode` puede ser null en cuentas anteriores al
 * sistema de referidos; `offersPushEnabled` gobierna solo los pushes de ofertas y
 * reactivación (los de tickets y referidos son transaccionales). */
export type UserProfile = components["schemas"]["UserProfileResponse"];

export type AuthResponse = components["schemas"]["AuthResponse"];

export type UpdateProfileData = {
	name?: string;
	profilePicture?: string;
	address?: string;
	alternativeBrandsEnabled?: boolean;
	offersPushEnabled?: boolean;
	/** A different email also needs `currentPassword`; the response carries a
	 * token issued for the new email, which replaces the session's. */
	email?: string;
	currentPassword?: string;
};

export function register(
	name: string,
	email: string,
	password: string,
	/** Código de quien invitó, si se completó en RegisterStep1. Opcional. */
	referralCode?: string,
): Promise<AuthResponse> {
	return request("/auth/register", {
		method: "POST",
		schema: AuthResponseSchema,
		json: {
			name,
			email,
			password,
			// El backend valida el código (existe, no es el propio) y acredita
			// los puntos de bienvenida. Un código mal tipeado o inválido nunca
			// debe bloquear el alta — el backend lo ignora en ese caso.
			...(referralCode ? { referralCode } : {}),
		},
	});
}

export function login(email: string, password: string): Promise<AuthResponse> {
	return request("/auth/login", { method: "POST", schema: AuthResponseSchema, json: { email, password } });
}

export function getProfile(token: string): Promise<UserProfile> {
	return request("/users/me", { token, schema: UserProfileSchema });
}

export function updateProfile(token: string, data: UpdateProfileData): Promise<AuthResponse> {
	return request("/users/profile", { method: "PUT", token, json: data, schema: AuthResponseSchema });
}

/** New token: changing the password revokes every earlier one. */
export function changePassword(
	token: string,
	currentPassword: string,
	newPassword: string,
): Promise<AuthResponse> {
	return request("/users/password", {
		method: "PUT",
		token,
		json: { currentPassword, newPassword },
		schema: AuthResponseSchema,
	});
}

/** Emails a 6-digit code. The server answers the same whether or not the
 * email has an account, so a success here does not mean a mail was sent. */
export function requestPasswordReset(email: string): Promise<void> {
	return requestVoid("/auth/forgot-password", { method: "POST", json: { email } });
}

/** Rejects a wrong or expired code before the user types a new password. */
export function verifyResetCode(email: string, code: string): Promise<void> {
	return requestVoid("/auth/verify-reset-code", { method: "POST", json: { email, code } });
}

export function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
	return requestVoid("/auth/reset-password", { method: "POST", json: { email, code, newPassword } });
}

/** What the user should read for a failed auth call: fetch throws a bare
 * TypeError with no connection, and the backend's own messages are already
 * in Spanish. */
export function friendlyAuthError(err: unknown): string {
	const message = err instanceof Error ? err.message : "";
	if (err instanceof TypeError || /network|fetch|failed to/i.test(message)) {
		return "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.";
	}
	if (!message || /^Error del servidor/i.test(message)) {
		return "Algo salió mal de nuestro lado. Probá de nuevo en unos minutos.";
	}
	return message;
}

export function uploadProfilePicture(token: string, base64: string): Promise<AuthResponse> {
	return updateProfile(token, { profilePicture: base64 });
}
