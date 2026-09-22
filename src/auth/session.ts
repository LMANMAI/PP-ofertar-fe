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
 * Código de referido del usuario. El backend ahora lo genera y lo persiste
 * (columna `referral_code` en `User`) y lo devuelve en `UserProfile.referralCode`
 * — es la fuente de verdad. La fórmula de acá abajo queda solo como fallback
 * para una sesión vieja en caché que todavía no tenga el campo (por ejemplo,
 * justo después de actualizar la app antes de refrescar el perfil).
 */
export function getReferralCode(user: { id: number; name: string; referralCode?: string }): string {
	if (user.referralCode) return user.referralCode;
	const initials = getInitials(user.name).toUpperCase() || "OF";
	const suffix = String(user.id).padStart(4, "0").slice(-4);
	return `OFERTAR-${initials}${suffix}`;
}
