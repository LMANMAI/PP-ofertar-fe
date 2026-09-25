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
 *
 * Tickets also print the whole line in capitals and with the pack size spelled
 * the receipt's way ("POR 25 GRAMOS"). An all-caps name is rewritten the way
 * the catalog writes it; a name that already has lowercase is left alone,
 * because it came from somewhere that formatted it on purpose.
 */
export function displayProductName(name: string): string {
	const stripped = name.replace(/^\s*\d{4,}\s+/, "").trim();
	// A name that was ONLY a code would strip to nothing — showing the raw
	// code is still more useful to the user than showing a blank line.
	if (!stripped) return name;
	return hasLowercase(stripped) ? stripped : tidyReceiptName(stripped);
}

/**
 * A ticket line that is really a promotion the register printed, like
 * "2 POR 97.00 (21.00%)": the OCR reads it as one more purchased product. It
 * names nothing anyone can buy, so lists of products should leave it out.
 */
export function isPromoLine(name: string): boolean {
	return /^\s*\d+\s*(x|por)\s*[\d.,]+\s*(\(.*\))?\s*$/i.test(name);
}

function hasLowercase(value: string): boolean {
	return /\p{Ll}/u.test(value);
}

const UNITS: Record<string, string> = {
	GRAMO: "g", GRAMOS: "g", GRS: "g", GR: "g", G: "g",
	KILO: "kg", KILOS: "kg", KGS: "kg", KG: "kg",
	LITRO: "l", LITROS: "l", LTS: "l", LT: "l", L: "l",
	ML: "ml", CC: "cc",
	UNIDAD: "un", UNIDADES: "un", UN: "un", U: "un",
	METRO: "m", METROS: "m", MTS: "m", MT: "m", M: "m",
};

// Words a title keeps in lowercase. Not "la"/"el": in a brand ("La Parmesana")
// they are part of the name.
const CONNECTORS = new Set(["de", "del", "con", "en", "y", "por", "para", "sin"]);

function tidyReceiptName(name: string): string {
	let s = name;

	// "50GR." -> "50 g": a size glued to its unit, with the printer's full stop.
	s = s.replace(/(\d)\s*(GRS?|G|KGS?|ML|CC)\b\.?/g, (_, n: string, u: string) => `${n} ${UNITS[u]}`);

	// "POR 25 GRAMOS" -> "25 g". Left alone after a number ("4 POR 80 M" is
	// four rolls of 80 m, and dropping the "por" would read as 480).
	s = s.replace(
		/(\S)(\s+)POR\s+(\d+(?:[.,]\d+)?)\s*(GRAMOS?|GRS?|G|KILOS?|KGS?|LITROS?|LTS?|LT|ML|CC|UNIDAD(?:ES)?|UN|METROS?|MTS?)\b\.?/g,
		(match: string, before: string, gap: string, n: string, u: string) =>
			/\d/.test(before) ? match : `${before}${gap}${n} ${UNITS[u]}`,
	);

	// "POR KILOS." -> "por kg": sold by weight.
	s = s.replace(/\bPOR\s+KILOS?\b\.?/g, "por kg");

	// A "POR 80" cut off before its unit, or a bare "POR": nothing to say.
	s = s.replace(/\s+POR(\s+\d+(?:[.,]\d+)?)?\.?$/, "");

	return s
		.split(/\s+/)
		.map((word, i) => titleWord(word, i))
		.join(" ")
		.trim();
}

function titleWord(word: string, index: number): string {
	// Units already written in lowercase above.
	if (/^(g|kg|l|ml|cc|un|m|por)$/.test(word)) return word;
	const lower = word.toLowerCase();
	if (index > 0 && CONNECTORS.has(lower)) return lower;
	// A lone letter or a short word with no vowel is an abbreviation ("C", "P",
	// "HS"): capitals stay. "LA" has a vowel, so it is a word.
	if (/^\p{L}$/u.test(word) || (word.length <= 3 && /^[^AEIOUaeiou\d]+$/.test(word) && /^\p{L}+$/u.test(word))) return word;
	return lower.charAt(0).toUpperCase() + lower.slice(1);
}
