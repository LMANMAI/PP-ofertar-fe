import { useCallback, useEffect, useState } from "react";
import { getSucursalesCercanas } from "../services";
import type { SucursalesCercanas } from "../services";
import type { Origin } from "./useShopperContext";

export type NearbyBranches =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "ready"; data: SucursalesCercanas }
	| { status: "error"; message: string };

type Settled = { key: string; data: SucursalesCercanas } | { key: string; error: string };

/**
 * The cheapest branch of each chain within the radius of where the user is, for
 * one product. Idle until there is a position to search around and a product that
 * has prices; a change of product, place or radius starts over, and `retry` asks
 * again after a failure.
 *
 * The state is derived from the key of the last answer instead of being reset in
 * an effect: an answer for a previous product can never be shown for the current
 * one, and there is no window where the old result sits under the new title.
 */
export function useNearbyBranches(
	ean: string,
	origin: Origin,
	radiusKm: number,
	enabled: boolean,
): NearbyBranches & { retry: () => void } {
	const [settled, setSettled] = useState<Settled | null>(null);
	const [attempt, setAttempt] = useState(0);

	const ready = enabled && origin.status === "ready";
	const latitude = origin.status === "ready" ? origin.latitude : 0;
	const longitude = origin.status === "ready" ? origin.longitude : 0;
	const key = `${ean}|${latitude.toFixed(4)},${longitude.toFixed(4)}|${radiusKm}|${attempt}`;

	useEffect(() => {
		if (!ready) return;
		let cancelled = false;
		getSucursalesCercanas(ean, latitude, longitude, radiusKm)
			.then((data) => !cancelled && setSettled({ key, data }))
			.catch((e) => !cancelled && setSettled({ key, error: e instanceof Error ? e.message : "No pudimos buscar sucursales." }));
		return () => {
			cancelled = true;
		};
	}, [ready, ean, latitude, longitude, radiusKm, key]);

	const retry = useCallback(() => setAttempt((n) => n + 1), []);

	if (!ready) return { status: "idle", retry };
	if (!settled || settled.key !== key) return { status: "loading", retry };
	return "error" in settled
		? { status: "error", message: settled.error, retry }
		: { status: "ready", data: settled.data, retry };
}
