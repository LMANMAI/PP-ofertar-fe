/**
 * Argentine supermarket tickets print each line as "CÓDIGO DESCRIPCIÓN" — an
 * internal SKU the cashier scans, glued to the front of the product name.
 * The OCR reads that whole string, so it ends up in `description` too. That
 * code means nothing to a customer, so every product name shown anywhere in
 * the app goes through here first: a leading run of 4+ digits followed by
 * whitespace is stripped before the name reaches a screen.
 *
 * 4 digits is the floor because a real internal code is never shorter than
 * that in practice, while a legitimate product name can start with a short
 * number ("3 en 1", "2 litros") that must survive untouched.
 */
export function displayProductName(name: string): string {
	const stripped = name.replace(/^\s*\d{4,}\s+/, "").trim();
	// A name that was ONLY a code would strip to nothing — showing the raw
	// code is still more useful to the user than showing a blank line.
	return stripped || name;
}
