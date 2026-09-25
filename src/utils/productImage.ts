/**
 * The photo a product card may show, or nothing.
 *
 * Lives outside the screen so it can be exercised without React Native: it is
 * the guard standing between a catalog field we do not control and an
 * `<Image>` that fails silently, leaving a hole where the tile should be.
 *
 * Only absolute http(s) URLs pass. A relative path, a `data:` blob, an empty
 * string or a backend that predates the field all mean the same thing to the
 * card — draw the icon.
 */
export function catalogImageUri(url: string | null | undefined): string | null {
	if (typeof url !== "string") return null;
	const trimmed = url.trim();
	return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}
