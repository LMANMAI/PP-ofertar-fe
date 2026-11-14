import { API_BASE_URL } from "../config";

const DEEP_LINK = /^ofertar:\/\/referido\/([A-Za-z0-9]{4,12})\/?$/;

/** La página pública que abre la app con el código cargado. */
export function referralLink(code: string): string {
	return `${API_BASE_URL}/r/${code}`;
}

/** El código de un link `ofertar://referido/CODIGO`, o null si es otro link. */
export function referralCodeFromUrl(url: string | null | undefined): string | null {
	const match = url ? DEEP_LINK.exec(url.trim()) : null;
	return match ? match[1].toUpperCase() : null;
}
