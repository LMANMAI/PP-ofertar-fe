/**
 * Dónde se centra la búsqueda de sucursales y de precios: la ubicación del
 * teléfono, o uno de dos lugares guardados, Casa y Trabajo.
 *
 * Esto es la lógica pura (sin Expo), para poder probarla con Node; el acceso real
 * a SecureStore/AsyncStorage lo arma `searchOrigin.ts`. Los lugares se guardan
 * en el dispositivo, en SecureStore y no en almacenamiento plano, igual que el
 * punto único de antes: "Casa" es literalmente la casa de alguien. El backend no
 * los recibe nunca; sólo recibe lat/lng en cada búsqueda, como siempre.
 */

/** Un punto elegido para buscar cerca, en vez de donde está el teléfono. */
export type SearchOrigin = {
	latitude: number;
	longitude: number;
	/** Lo que se muestra: la dirección que se escribió o la que hay bajo el pin. */
	label: string;
};

export type PlaceSlot = "casa" | "trabajo";
export type ReferenceKind = "current" | PlaceSlot;

export type SearchPlaces = {
	/** La referencia elegida. Si es un lugar que no está guardado, vale "current". */
	active: ReferenceKind;
	casa: SearchOrigin | null;
	trabajo: SearchOrigin | null;
};

export const PLACE_SLOTS: PlaceSlot[] = ["casa", "trabajo"];

export const REFERENCE_NAMES: Record<ReferenceKind, string> = {
	current: "Ubicación actual",
	casa: "Casa",
	trabajo: "Trabajo",
};

export const EMPTY_PLACES: SearchPlaces = { active: "current", casa: null, trabajo: null };

/**
 * Radios que se ofrecen, en km. El backend acepta 1..20. El 2 está porque entre
 * 1 km (la cuadra) y 3 km (medio barrio) no había nada para quien va caminando.
 */
export const RADIUS_OPTIONS_KM = [1, 2, 3, 5, 10, 15, 20] as const;

// Límites aproximados de Argentina. Las sucursales y ofertas son todas de acá:
// una respuesta del geocoder fuera de esta caja es un homónimo en otro país.
const AR_BOUNDS = { minLat: -55.5, maxLat: -21.5, minLng: -73.8, maxLng: -53.4 };

export function isInArgentina(latitude: number, longitude: number): boolean {
	return (
		latitude >= AR_BOUNDS.minLat &&
		latitude <= AR_BOUNDS.maxLat &&
		longitude >= AR_BOUNDS.minLng &&
		longitude <= AR_BOUNDS.maxLng
	);
}

/** Tope al texto guardado: SecureStore avisa por encima de ~2 KB por valor en iOS. */
const MAX_LABEL = 120;

export function parseOrigin(value: unknown): SearchOrigin | null {
	if (!value || typeof value !== "object") return null;
	const v = value as Partial<SearchOrigin>;
	if (
		typeof v.latitude !== "number" ||
		typeof v.longitude !== "number" ||
		!Number.isFinite(v.latitude) ||
		!Number.isFinite(v.longitude) ||
		!isInArgentina(v.latitude, v.longitude)
	) {
		return null;
	}
	const label = typeof v.label === "string" && v.label.trim() ? v.label.trim().slice(0, MAX_LABEL) : "Ubicación elegida";
	return { latitude: v.latitude, longitude: v.longitude, label };
}

function parseJson(raw: string | null): unknown {
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

export function parsePlaces(raw: string | null): SearchPlaces | null {
	const value = parseJson(raw) as { v?: unknown; active?: unknown; casa?: unknown; trabajo?: unknown } | null;
	if (!value || typeof value !== "object" || value.v !== 2) return null;
	const places: SearchPlaces = {
		active: value.active === "casa" || value.active === "trabajo" ? value.active : "current",
		casa: parseOrigin(value.casa),
		trabajo: parseOrigin(value.trabajo),
	};
	return normalize(places);
}

export function serializePlaces(places: SearchPlaces): string {
	return JSON.stringify({ v: 2, ...normalize(places) });
}

/** Un lugar activo que no está guardado no puede ser la referencia. */
function normalize(places: SearchPlaces): SearchPlaces {
	return places.active !== "current" && !places[places.active] ? { ...places, active: "current" } : places;
}

/** La referencia en uso y su punto; null en `place` es "donde esté el teléfono". */
export function effectiveReference(places: SearchPlaces): { kind: ReferenceKind; place: SearchOrigin | null } {
	const p = normalize(places);
	return p.active === "current" ? { kind: "current", place: null } : { kind: p.active, place: p[p.active] };
}

/** Guarda (o reemplaza) un lugar y lo deja como referencia. */
export function withPlace(places: SearchPlaces, slot: PlaceSlot, origin: SearchOrigin): SearchPlaces {
	return normalize({ ...places, [slot]: parseOrigin(origin) ?? places[slot], active: slot });
}

/** Borra un lugar; si era la referencia, se vuelve a la ubicación actual. */
export function withoutPlace(places: SearchPlaces, slot: PlaceSlot): SearchPlaces {
	return normalize({ ...places, [slot]: null });
}

/** Cambia la referencia. Un lugar sin guardar no se puede elegir: queda como estaba. */
export function withActive(places: SearchPlaces, kind: ReferenceKind): SearchPlaces {
	if (kind !== "current" && !places[kind]) return places;
	return { ...places, active: kind };
}

/** "Cerca de Casa · 3 km", "Cerca tuyo · 3 km". Lo que se ve arriba del mapa y en los precios. */
export function referenceSummary(kind: ReferenceKind, radiusKm: number): string {
	const km = `${radiusKm.toLocaleString("es-AR", { maximumFractionDigits: 1 })} km`;
	return kind === "current" ? `Cerca tuyo · ${km}` : `Cerca de ${REFERENCE_NAMES[kind]} · ${km}`;
}

// ------------------------------------------------------------ almacenamiento

export type KeyValueStore = {
	get(key: string): Promise<string | null>;
	set(key: string, value: string): Promise<void>;
	remove(key: string): Promise<void>;
};

export type PlacesStorage = {
	/** SecureStore. Tira en web, donde no hay llavero. */
	secure: KeyValueStore;
	/** AsyncStorage: sólo para leer y borrar la copia de la primera versión. */
	legacy: KeyValueStore;
};

export const placesKey = (userId: number) => `ofertar.searchPlaces.${userId}`;
/** El punto único de antes. Primero vivió en AsyncStorage, después en SecureStore. */
export const legacyOriginKey = (userId: number) => `ofertar.favoriteStores.origin.${userId}`;

async function quietly<T>(fn: () => Promise<T>): Promise<T | null> {
	try {
		return await fn();
	} catch {
		return null;
	}
}

export async function savePlacesTo(storage: PlacesStorage, userId: number, places: SearchPlaces): Promise<boolean> {
	try {
		await storage.secure.set(placesKey(userId), serializePlaces(places));
		return true;
	} catch {
		// La elección vale para esta visita; sólo no se recuerda.
		return false;
	}
}

/**
 * Los lugares del usuario, migrando el punto único de la versión anterior.
 *
 * Migración: el punto viejo pasa a ser **Casa, y queda activo**. Activo porque
 * era la referencia en uso (le ganaba a la ubicación del teléfono), así que el
 * mapa y los precios siguen centrados donde estaban. Casa porque es lo que el
 * código de antes suponía ("un lugar elegido para comprar suele ser tu casa") y
 * no hay otro dato para decidir; conserva su dirección como texto, así que se ve
 * "Casa · Av. Cabildo 1200" y se puede cambiar. Las copias viejas (SecureStore y
 * la de AsyncStorage de la primera versión) se borran sólo después de escribir
 * la nueva: si no se pudo guardar, el punto viejo se sigue leyendo la próxima vez
 * en vez de perderse.
 */
export async function loadPlacesFrom(storage: PlacesStorage, userId: number): Promise<SearchPlaces> {
	let secureWorks = true;
	try {
		const current = parsePlaces(await storage.secure.get(placesKey(userId)));
		if (current) return current;
	} catch {
		secureWorks = false;
	}

	const oldKey = legacyOriginKey(userId);
	const old =
		(secureWorks ? parseOrigin(parseJson(await quietly(() => storage.secure.get(oldKey)))) : null) ??
		parseOrigin(parseJson(await quietly(() => storage.legacy.get(oldKey))));
	if (!old) return EMPTY_PLACES;

	const migrated: SearchPlaces = { active: "casa", casa: old, trabajo: null };
	if (secureWorks && (await savePlacesTo(storage, userId, migrated))) {
		await quietly(() => storage.secure.remove(oldKey));
		await quietly(() => storage.legacy.remove(oldKey));
	}
	return migrated;
}
