// Words that say nothing about which product it is: connectors, and the
// packaging and unit words that one source spells out ("sobre", "gramos") and
// the other abbreviates ("sob", "grm"). Singular, because the plural is
// stripped before this is checked.
const FILLER = new Set([
	"del", "los", "las", "con", "sin", "por", "para",
	"sobre", "sob", "gramo", "grm", "grs", "unidad", "kilo", "litro", "paquete", "caja", "pack",
]);

function tokens(value: string): string[] {
	return (
		value
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			// Plural and singular are the same word.
			.map((t) => (t.endsWith("s") ? t.slice(0, -1) : t))
			// Numbers and units ("1", "500", "g") vary by presentation, and the size is
			// not what tells two products apart here.
			.filter((t) => t.length > 2 && !FILLER.has(t) && !/^\d/.test(t))
	);
}

/**
 * Whether the catalog product a price belongs to is probably NOT what the user
 * bought. The backend matches by brand and kind of product, so a bin bag can end
 * up priced against paper towels of the same brand. Until it sends a match
 * confidence, this approximates one: the first word of a Spanish product name is
 * the product ("Laurel molido", "Bolsa maxi"), and it has to appear in the
 * catalog name along with most of the other words.
 *
 * Returns false when there is nothing to compare, so an unknown match is not
 * downgraded on a guess.
 */
export function isLooseMatch(bought: string, matched: string | null | undefined): boolean {
	if (!matched) return false;
	const want = tokens(bought);
	if (want.length === 0) return false;
	const have = new Set(tokens(matched));
	if (!have.has(want[0])) return true;
	const covered = want.filter((t) => have.has(t)).length;
	return covered / want.length < 0.6;
}
