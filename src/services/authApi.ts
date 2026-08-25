const BASE_URL = "https://ofertar-backend-ofertar-backend.qr2vg3.easypanel.host";

export type UserProfile = {
	id: number;
	name: string;
	email: string;
	profilePicture: string | null;
	address: string | null;
	phone: string | null;
	/** Show offers on the same product from other brands. */
	alternativeBrandsEnabled: boolean;
	createdAt: string;
};

export type AuthResponse = {
	token: string;
	user: UserProfile;
};

export type UpdateProfileData = {
	name?: string;
	profilePicture?: string;
	address?: string;
	phone?: string;
	alternativeBrandsEnabled?: boolean;
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
): Promise<AuthResponse> {
	const res = await fetch(`${BASE_URL}/auth/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, email, password }),
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
