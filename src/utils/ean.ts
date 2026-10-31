/**
 * SEPA, the tickets and the scanner spell the same barcode in different ways:
 * 13 digits, 14 with a leading zero, with spaces. The backend compares them
 * after `ProductoImagenService.normalizarEan`, and this is the same rule, so
 * the app and the backend agree on when two codes are the same product.
 *
 * Returns the 13-digit EAN, or null when it is not a usable one.
 */
export function normalizeEan(ean: string | null | undefined): string | null {
	if (ean == null) return null;
	let digits = ean.replace(/\D/g, "");
	if (digits.length === 0) return null;
	// GTIN-14 / an EAN with leading zeros -> EAN-13.
	digits = digits.replace(/^0+(?=\d{13}$)/, "");
	if (digits.length > 14) return null;
	// EAN-8 and shorter internal codes are padded to 13.
	digits = digits.padStart(13, "0");
	// All zeros, or one digit repeated, is junk from the dataset.
	if (new Set(digits).size <= 1) return null;
	return digits;
}

/**
 * Whether two codes are the same product. A code the rule rejects is only the
 * same as itself, spelled the same way.
 */
export function sameEan(a: string, b: string): boolean {
	const na = normalizeEan(a);
	const nb = normalizeEan(b);
	if (na != null || nb != null) return na === nb;
	return a.trim() === b.trim();
}

/**
 * What the backend accepts as the code of a product to follow. A shorter read
 * (a 6-digit UPC-E) still finds prices, but following it is a 400.
 */
export function isFollowableEan(ean: string): boolean {
	return /^\d{8,14}$/.test(ean);
}

/** Whether `ean` is in the list, in whichever format either side spells it. */
export function includesEan(eans: readonly string[], ean: string): boolean {
	return eans.some((e) => sameEan(e, ean));
}

/**
 * Whether a product bought on a ticket is also one the user follows. The
 * backend says so in `followed` when the list loads; the codes the scanner
 * keeps are newer once read (a product followed or unfollowed since), and
 * until then, or without a barcode to compare, the backend's answer stands.
 */
export function isFollowedPurchase(
	product: { barcode: string | null; followed: boolean },
	followedEans: readonly string[] | null,
): boolean {
	if (followedEans == null || !product.barcode) return product.followed;
	return includesEan(followedEans, product.barcode);
}
