import type { ComercioPrecioResponse, SucursalPrecio } from "../services/sepaApi";
import type { StoreChain } from "../services/storesApi";
import type { RecurringProduct } from "../services";

// Words that say nothing about which chain it is.
const STOP = new Set(["supermercados", "supermercado", "super", "hipermercados", "hipermercado", "argentina"]);

function tokens(value: string | null | undefined): string[] {
	return (value ?? "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((t) => t.length > 2 && !STOP.has(t));
}

/**
 * Names SEPA uses that the scraper's chain slugs do not. SEPA files Jumbo, Disco
 * and Vea under their owner ("Cencosud"), and Carrefour's own hypermarkets under
 * "Maxi". Anything not listed here matches on the slug or the chain's name.
 */
const ALIASES: Record<string, string[]> = {
	jumbo: ["cencosud"],
	disco: ["cencosud"],
	vea: ["cencosud"],
	carrefour: ["maxi", "market", "express"],
};

/** Businesses that sell the product but are not where anyone does the shopping:
 * a gas station's price would drive both the minimum and the maximum. */
const NOT_A_SUPERMARKET = /axion|farmacity|estaci[oó]n|deheza|\bypf\b|shell|petrobras/i;

export function isSupermarket(c: { bandera: string | null; razonSocial?: string | null; nombre?: string | null }): boolean {
	return !NOT_A_SUPERMARKET.test(`${c.bandera ?? ""} ${c.razonSocial ?? ""} ${c.nombre ?? ""}`);
}

function chainTokens(chain: StoreChain): Set<string> {
	return new Set([...tokens(chain.slug), ...tokens(chain.name), ...(ALIASES[chain.slug.toLowerCase()] ?? [])]);
}

/** Whether a SEPA comercio or branch is one of the given chains, by its banner. */
export function isChain(c: { bandera: string | null }, chains: StoreChain[]): boolean {
	const own = tokens(c.bandera);
	return chains.some((chain) => {
		const wanted = chainTokens(chain);
		return own.some((t) => wanted.has(t));
	});
}

/**
 * How a list of stores divides by the chains the user picked in "Mis tiendas
 * favoritas":
 *
 * - "favorites": they picked chains and at least one is in the list.
 * - "none-in-favorites": they picked chains and none of them is.
 * - "all": no chains picked, or the list of chains could not be read, so there is
 *   nothing to narrow by.
 */
export type Scope = "favorites" | "none-in-favorites" | "all";

export type Scoped<T> = {
	mode: Scope;
	/** The favorite chains that have it, cheapest first. */
	favorites: T[];
	/** Every other supermarket, cheapest first. */
	others: T[];
	/** The lowest price in scope: among the favorites, or overall in "all". */
	best: T | null;
	/** The lowest price outside the favorites, for when they have none. */
	otherBest: T | null;
};

function splitByFavorites<T extends { bandera: string | null }>(
	sorted: T[],
	allChains: StoreChain[],
	favoriteSlugs: string[],
): Scoped<T> {
	const picked = allChains.filter((c) => favoriteSlugs.includes(c.slug));
	if (picked.length === 0) {
		return { mode: "all", favorites: [], others: sorted, best: sorted[0] ?? null, otherBest: null };
	}
	const favorites = sorted.filter((c) => isChain(c, picked));
	const others = sorted.filter((c) => !favorites.includes(c));
	return {
		mode: favorites.length > 0 ? "favorites" : "none-in-favorites",
		favorites,
		others,
		best: favorites[0] ?? null,
		otherBest: others[0] ?? null,
	};
}

export type ScopedPrices = Scoped<ComercioPrecioResponse>;

const byPrice = (a: ComercioPrecioResponse, b: ComercioPrecioResponse) =>
	(a.precioMinimo ?? Infinity) - (b.precioMinimo ?? Infinity);

/**
 * Splits the chains that carry a product by the ones the user picked. These prices
 * are per chain — the lowest across all its branches in the country — so this can
 * narrow by chain but not by where the user is: it is the fallback for when the
 * branches near them are not known.
 */
export function scopePrices(
	comercios: ComercioPrecioResponse[],
	allChains: StoreChain[],
	favoriteSlugs: string[],
): ScopedPrices {
	const eligible = comercios.filter((c) => c.precioMinimo != null && isSupermarket(c)).sort(byPrice);
	return splitByFavorites(eligible, allChains, favoriteSlugs);
}

export type ScopedBranches = Scoped<SucursalPrecio>;

const byBranchPrice = (a: SucursalPrecio, b: SucursalPrecio) => a.precio - b.precio || a.distanciaKm - b.distanciaKm;

/**
 * Splits the cheapest nearby branch of each chain by the ones the user picked. The
 * backend already sends one branch per chain within the radius, so nothing here
 * says how far is "near": that was decided when they asked.
 */
export function scopeBranches(
	sucursales: SucursalPrecio[],
	allChains: StoreChain[],
	favoriteSlugs: string[],
): ScopedBranches {
	const eligible = sucursales.filter((s) => isSupermarket(s)).sort(byBranchPrice);
	return splitByFavorites(eligible, allChains, favoriteSlugs);
}

export type Verdict = { tone: "good" | "near" | "above"; pct: number };

/** Where a shelf price sits against the lowest one in scope. Words are the
 * screen's business; this only measures. */
export function verdictFor(shelf: number, lowest: number): Verdict {
	if (shelf <= lowest) return { tone: "good", pct: 0 };
	const pct = ((shelf - lowest) / lowest) * 100;
	return { tone: pct < 10 ? "near" : "above", pct };
}

/**
 * A price typed the Argentine way: "1.250,50", "1250", "1250.5". A dot followed by
 * exactly three digits is a thousands separator ("5.500" is five thousand five
 * hundred, not five and a half): that is how prices are written here.
 */
export function parseShelfPrice(text: string): number | null {
	const t = text.trim();
	if (!t) return null;
	const thousands = /^\d{1,3}(\.\d{3})+$/.test(t);
	const normalized = /,/.test(t) || thousands ? t.replace(/\./g, "").replace(",", ".") : t;
	const n = Number(normalized);
	return Number.isFinite(n) && n > 0 ? n : null;
}

/** SEPA dates arrive as "2026-09-15". Parsed as a local day: `new Date` on that
 * string is UTC midnight, which is the evening before in Argentina. */
function parseDay(iso: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	if (!m) return null;
	return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "15 de septiembre · hace 9 días". Null when there is no usable date. */
export function describeDatasetDate(iso: string | null, now = new Date()): { label: string; days: number } | null {
	if (!iso) return null;
	const d = parseDay(iso);
	if (!d) return null;
	const days = Math.max(0, Math.round((now.setHours(0, 0, 0, 0) - d.getTime()) / 86_400_000));
	const day = d.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
	const ago = days === 0 ? "hoy" : days === 1 ? "ayer" : `hace ${days} días`;
	return { label: `${day} · ${ago}`, days };
}

/** The user's own purchase of a scanned product, if it is one of the products
 * they buy regularly. SEPA writes the same code with and without leading zeros. */
export function findPurchase(products: RecurringProduct[], ean: string): RecurringProduct | null {
	const strip = (s: string | null) => (s ?? "").replace(/^0+/, "");
	const wanted = strip(ean);
	if (!wanted) return null;
	return products.find((p) => strip(p.barcode) === wanted) ?? null;
}
