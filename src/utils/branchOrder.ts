import type { SucursalPrecio } from "../services/sepaApi";
import type { ScopedBranches } from "./scanResult";
import { isOpenNow, openingStatus, type OpeningStatus } from "./openingHours";

/**
 * El orden de la lista de "más baratas cerca", con el horario en cuenta.
 *
 * El precio manda siempre: una sucursal cerrada más barata queda arriba de una
 * abierta más cara, porque la lista dice "de la más barata a la más cara" y
 * bajarla cambiaría lo que significa. El horario sólo desempata: a igual precio
 * va primero la que está abierta ahora (una cerrada o una sin horario no sirve
 * para ir ya), y después la más cercana. Sin horarios, que es lo que manda hoy
 * el backend, el orden es exactamente el de `scopeBranches`: precio y distancia.
 */
export function compareBranchesAt(now: Date | number): (a: SucursalPrecio, b: SucursalPrecio) => number {
	const cache = new Map<SucursalPrecio, number>();
	const openRank = (s: SucursalPrecio) => {
		let rank = cache.get(s);
		if (rank === undefined) {
			rank = isOpenNow(openingStatus(s.horarios, now)) ? 0 : 1;
			cache.set(s, rank);
		}
		return rank;
	};
	return (a, b) => a.precio - b.precio || openRank(a) - openRank(b) || a.distanciaKm - b.distanciaKm;
}

/**
 * Reordena lo que devolvió `scopeBranches` con el desempate por horario. Cada
 * lista conserva sus miembros; sólo cambia el orden entre las de igual precio, y
 * `best`/`otherBest` siguen siendo la cabeza de su lista, como en `Scoped`.
 */
export function rankScopedBranches(scoped: ScopedBranches, now: Date | number): ScopedBranches {
	const cmp = compareBranchesAt(now);
	const favorites = [...scoped.favorites].sort(cmp);
	const others = [...scoped.others].sort(cmp);
	return {
		...scoped,
		favorites,
		others,
		best: scoped.best == null ? null : ((scoped.mode === "all" ? others : favorites)[0] ?? null),
		otherBest: scoped.otherBest == null ? null : (others[0] ?? null),
	};
}

export function branchStatus(s: SucursalPrecio, now: Date | number): OpeningStatus {
	return openingStatus(s.horarios, now);
}
