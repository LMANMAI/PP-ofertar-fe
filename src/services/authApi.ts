const BASE_URL = "https://ofertar-backend-ofertar-backend.qr2vg3.easypanel.host";

export type UserProfile = {
	id: number;
	name: string;
	email: string;
	profilePicture: string | null;
	address: string | null;
	/** Show offers on the same product from other brands. */
	alternativeBrandsEnabled: boolean;
	createdAt: string;
	/** Código propio para invitar. Lo genera el backend al crear la cuenta. */
	referralCode: string;
	/** Saldo de puntos actual (fuente de verdad: backend, ver src/services/pointsApi.ts). */
	points: number;
};

export type AuthResponse = {
	token: string;
	user: UserProfile;
};

export type UpdateProfileData = {
	name?: string;
	profilePicture?: string;
	address?: string;
	alternativeBrandsEnabled?: boolean;
	/** A different email also needs `currentPassword`; the response carries a
	 * token issued for the new email, which replaces the session's. */
	email?: string;
	currentPassword?: string;
};

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

export async function register(
	name: string,
	email: string,
	password: string,
	/** Código de quien invitó, si se completó en RegisterStep1. Opcional. */
	referralCode?: string,
): Promise<AuthResponse> {
	const res = await fetch(`${BASE_URL}/auth/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			name,
			email,
			password,
			// El backend valida el código (existe, no es el propio) y acredita
			// los puntos de bienvenida. Un código mal tipeado o inválido nunca
			// debe bloquear el alta — el backend lo ignora en ese caso.
			...(referralCode ? { referralCode } : {}),
		}),
	});

	if (!res.ok) {
		const message = await parseApiError(res);
		throw new Error(message);
	}

	return res.json() as Promise<AuthResponse>;
}

export async function login(
	email: string,
	password: string,
): Promise<AuthResponse> {
	const res = await fetch(`${BASE_URL}/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});

	if (!res.ok) {
		const message = await parseApiError(res);
		throw new Error(message);
	}

	return res.json() as Promise<AuthResponse>;
}

export async function getProfile(token: string): Promise<UserProfile> {
	const res = await fetch(`${BASE_URL}/users/me`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	});

	if (!res.ok) {
		const message = await parseApiError(res);
		throw new Error(message);
	}

	return res.json() as Promise<UserProfile>;
}

export async function updateProfile(
	token: string,
	data: UpdateProfileData,
): Promise<AuthResponse> {
	const res = await fetch(`${BASE_URL}/users/profile`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(data),
	});

	if (!res.ok) {
		const message = await parseApiError(res);
		throw new Error(message);
	}

	return res.json() as Promise<AuthResponse>;
}

export async function changePassword(
	token: string,
	currentPassword: string,
	newPassword: string,
): Promise<void> {
	const res = await fetch(`${BASE_URL}/users/password`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ currentPassword, newPassword }),
	});

	if (!res.ok) {
		const message = await parseApiError(res);
		throw new Error(message);
	}
}

async function postNoContent(path: string, body: unknown): Promise<void> {
	const res = await fetch(`${BASE_URL}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		throw new Error(await parseApiError(res));
	}
}

/** Emails a 6-digit code. The server answers the same whether or not the
 * email has an account, so a success here does not mean a mail was sent. */
export function requestPasswordReset(email: string): Promise<void> {
	return postNoContent("/auth/forgot-password", { email });
}

/** Rejects a wrong or expired code before the user types a new password. */
export function verifyResetCode(email: string, code: string): Promise<void> {
	return postNoContent("/auth/verify-reset-code", { email, code });
}

export function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
	return postNoContent("/auth/reset-password", { email, code, newPassword });
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

export async function uploadProfilePicture(
	token: string,
	base64: string,
): Promise<AuthResponse> {
	const res = await fetch(`${BASE_URL}/users/profile`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ profilePicture: base64 }),
	});

	if (!res.ok) {
		const message = await parseApiError(res);
		throw new Error(message);
	}

	return res.json() as Promise<AuthResponse>;
}
