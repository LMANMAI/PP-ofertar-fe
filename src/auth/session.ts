import type { UserProfile } from "../services/authApi";

export type Session = {
	token: string;
	user: UserProfile;
};

export function getInitials(name: string): string {
	return name
		.split(" ")
		.filter(Boolean)
		.map((w) => w[0] ?? "")
		.slice(0, 2)
		.join("");
}

export function splitName(name: string): { firstName: string; lastName: string } {
	const parts = name.trim().split(/\s+/);
	return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export function getAvatarUri(profilePicture: string | null): string | undefined {
	if (!profilePicture) return undefined;
	if (profilePicture.startsWith("data:")) return profilePicture;
	if (profilePicture.startsWith("http")) return profilePicture;
	return `data:image/jpeg;base64,${profilePicture}`;
}

/**
 * Código de referido determinístico a partir del usuario. Mock del lado del
 * cliente: es estable para una misma cuenta, pero no está validado contra un
 * backend (todavía no existe ese soporte — ver notas de /impeccable audit).
 */
export function getReferralCode(user: { id: number; name: string }): string {
	const initials = getInitials(user.name).toUpperCase() || "OF";
	const suffix = String(user.id).padStart(4, "0").slice(-4);
	return `OFERTAR-${initials}${suffix}`;
}
