/**
 * Casa, Trabajo y la ubicación actual como referencia de búsqueda
 * (`src/location/searchPlaces.ts`), y el radio.
 *
 *   npx tsx scripts/verifySearchPlaces.ts
 *
 * Lo que tiene que cumplirse:
 *   - el punto único de la versión anterior sobrevive: pasa a ser Casa y queda
 *     activo, venga de SecureStore o de la copia vieja de AsyncStorage;
 *   - las copias viejas se borran sólo si la nueva se pudo guardar;
 *   - sin llavero (web) no se pierde nada;
 *   - un lugar activo que no existe no es la referencia;
 *   - los 7 radios entran en una fila a 360 dp, con 44 dp por opción.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
	EMPTY_PLACES,
	RADIUS_OPTIONS_KM,
	effectiveReference,
	legacyOriginKey,
	loadPlacesFrom,
	parsePlaces,
	placesKey,
	referenceSummary,
	savePlacesTo,
	serializePlaces,
	withActive,
	withPlace,
	withoutPlace,
	type KeyValueStore,
	type PlacesStorage,
} from "../src/location/searchPlaces";

let failures = 0;
async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
	try {
		await fn();
		console.log(`  ok   ${name}`);
	} catch (err) {
		failures++;
		console.log(`  FAIL ${name}`);
		console.log(`       ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
	}
}

/** Un almacenamiento en memoria; `broken` imita SecureStore en web, que tira siempre. */
function memory(initial: Record<string, string> = {}, broken = false): KeyValueStore & { data: Map<string, string> } {
	const data = new Map(Object.entries(initial));
	const guard = () => {
		if (broken) throw new Error("no keychain");
	};
	return {
		data,
		get: async (k) => (guard(), data.get(k) ?? null),
		set: async (k, v) => {
			guard();
			data.set(k, v);
		},
		remove: async (k) => {
			guard();
			data.delete(k);
		},
	};
}

const USER = 7;
const CABILDO = { latitude: -34.5627, longitude: -58.4563, label: "Av. Cabildo 1200" };
const OFICINA = { latitude: -34.6037, longitude: -58.3816, label: "Florida 100" };
const PARIS = { latitude: 48.85, longitude: 2.35, label: "Paris" };

async function main() {
	console.log("\nMigración del punto único");

	await check("el punto viejo en SecureStore pasa a ser Casa, activo, y la copia vieja se borra", async () => {
		const secure = memory({ [legacyOriginKey(USER)]: JSON.stringify(CABILDO) });
		const legacy = memory();
		const places = await loadPlacesFrom({ secure, legacy }, USER);
		assert.deepEqual(places, { active: "casa", casa: CABILDO, trabajo: null });
		assert.deepEqual(effectiveReference(places), { kind: "casa", place: CABILDO });
		assert.equal(secure.data.has(legacyOriginKey(USER)), false);
		assert.deepEqual(parsePlaces(secure.data.get(placesKey(USER)) ?? null), places);
	});

	await check("la copia de la primera versión (AsyncStorage) también sobrevive, y se borra de ahí", async () => {
		const secure = memory();
		const legacy = memory({ [legacyOriginKey(USER)]: JSON.stringify(CABILDO) });
		const places = await loadPlacesFrom({ secure, legacy }, USER);
		assert.deepEqual(places.casa, CABILDO);
		assert.equal(places.active, "casa");
		assert.equal(legacy.data.has(legacyOriginKey(USER)), false);
		assert.ok(secure.data.has(placesKey(USER)));
	});

	await check("migrar dos veces da lo mismo (la segunda lee el formato nuevo)", async () => {
		const storage: PlacesStorage = { secure: memory({ [legacyOriginKey(USER)]: JSON.stringify(CABILDO) }), legacy: memory() };
		const first = await loadPlacesFrom(storage, USER);
		const second = await loadPlacesFrom(storage, USER);
		assert.deepEqual(second, first);
	});

	await check("si el formato nuevo ya existe, el punto viejo no pisa nada", async () => {
		const nuevo = { active: "trabajo" as const, casa: null, trabajo: OFICINA };
		const secure = memory({ [placesKey(USER)]: serializePlaces(nuevo), [legacyOriginKey(USER)]: JSON.stringify(CABILDO) });
		const places = await loadPlacesFrom({ secure, legacy: memory() }, USER);
		assert.deepEqual(places, nuevo);
	});

	await check("sin llavero (web) el punto viejo se usa y NO se borra, para no perderlo", async () => {
		const secure = memory({}, true);
		const legacy = memory({ [legacyOriginKey(USER)]: JSON.stringify(CABILDO) });
		const places = await loadPlacesFrom({ secure, legacy }, USER);
		assert.deepEqual(places.casa, CABILDO);
		assert.equal(legacy.data.has(legacyOriginKey(USER)), true);
	});

	await check("si guardar el formato nuevo falla, las copias viejas quedan", async () => {
		const secure = memory({ [legacyOriginKey(USER)]: JSON.stringify(CABILDO) });
		secure.set = async () => {
			throw new Error("lleno");
		};
		const places = await loadPlacesFrom({ secure, legacy: memory() }, USER);
		assert.deepEqual(places.casa, CABILDO);
		assert.equal(secure.data.has(legacyOriginKey(USER)), true);
	});

	await check("un punto viejo fuera de Argentina o roto no se migra", async () => {
		for (const raw of [JSON.stringify(PARIS), "{no es json", JSON.stringify({ latitude: "x" })]) {
			const places = await loadPlacesFrom({ secure: memory({ [legacyOriginKey(USER)]: raw }), legacy: memory() }, USER);
			assert.deepEqual(places, EMPTY_PLACES);
		}
	});

	await check("sin nada guardado: ubicación actual", async () => {
		assert.deepEqual(await loadPlacesFrom({ secure: memory(), legacy: memory() }, USER), EMPTY_PLACES);
	});

	await check("cada usuario tiene lo suyo", async () => {
		const secure = memory({ [legacyOriginKey(1)]: JSON.stringify(CABILDO) });
		assert.deepEqual(await loadPlacesFrom({ secure, legacy: memory() }, 2), EMPTY_PLACES);
		assert.deepEqual((await loadPlacesFrom({ secure, legacy: memory() }, 1)).casa, CABILDO);
	});

	console.log("\nElegir y guardar");

	await check("guardar Trabajo lo deja activo; Casa sigue guardada", () => {
		const p = withPlace({ active: "casa", casa: CABILDO, trabajo: null }, "trabajo", OFICINA);
		assert.equal(p.active, "trabajo");
		assert.deepEqual(p.casa, CABILDO);
	});

	await check("no se puede activar un lugar sin guardar", () => {
		assert.equal(withActive(EMPTY_PLACES, "trabajo").active, "current");
	});

	await check("borrar el lugar activo vuelve a la ubicación actual", () => {
		const p = withoutPlace({ active: "casa", casa: CABILDO, trabajo: OFICINA }, "casa");
		assert.equal(p.active, "current");
		assert.equal(p.casa, null);
		assert.deepEqual(p.trabajo, OFICINA);
	});

	await check("un activo sin lugar (dato viejo o roto) cae en la ubicación actual", () => {
		const p = parsePlaces(JSON.stringify({ v: 2, active: "trabajo", casa: CABILDO, trabajo: null }));
		assert.equal(p?.active, "current");
		assert.deepEqual(effectiveReference(p ?? EMPTY_PLACES), { kind: "current", place: null });
	});

	await check("un lugar fuera de Argentina no se guarda", () => {
		const p = withPlace(EMPTY_PLACES, "casa", PARIS);
		assert.equal(p.casa, null);
		assert.equal(p.active, "current");
	});

	await check("ida y vuelta por el almacenamiento", async () => {
		const storage = { secure: memory(), legacy: memory() };
		const p = { active: "trabajo" as const, casa: CABILDO, trabajo: OFICINA };
		assert.equal(await savePlacesTo(storage, USER, p), true);
		assert.deepEqual(await loadPlacesFrom(storage, USER), p);
	});

	await check("lo que se ve: 'Cerca de Casa · 3 km'", () => {
		assert.equal(referenceSummary("casa", 3), "Cerca de Casa · 3 km");
		assert.equal(referenceSummary("trabajo", 2), "Cerca de Trabajo · 2 km");
		assert.equal(referenceSummary("current", 10), "Cerca tuyo · 10 km");
	});

	console.log("\nEl radio");

	await check("se ofrece 2 km, y todos dentro de lo que acepta el backend (1..20)", () => {
		assert.deepEqual([...RADIUS_OPTIONS_KM], [1, 2, 3, 5, 10, 15, 20]);
		assert.ok(RADIUS_OPTIONS_KM.every((km) => km >= 1 && km <= 20));
	});

	await check("los radios entran en una fila a 360 dp con opciones de ≥ 44 dp", () => {
		// El control segmentado reparte el ancho útil en partes iguales (flex: 1),
		// con el margen de la pantalla a cada lado. Se lee del código para que un
		// cambio de margen o de diseño no deje este chequeo mintiendo.
		const root = resolve(__dirname, "..");
		const screen = readFileSync(resolve(root, "src/screens/FavoriteStoresScreen.tsx"), "utf8");
		const design = readFileSync(resolve(root, "src/theme/designSystem.tsx"), "utf8");
		const row = /radiusRow:\s*\{([^}]*)\}/.exec(screen)?.[1] ?? "";
		const segment = /radiusSegment:\s*\{([^}]*)\}/.exec(screen)?.[1] ?? "";
		assert.match(row, /flexDirection:\s*"row"/, "radiusRow ya no es una fila");
		assert.doesNotMatch(row, /flexWrap/, "radiusRow hace wrap: revisar el diseño");
		assert.match(segment, /flex:\s*1/, "los segmentos ya no reparten el ancho");
		const margin = /marginHorizontal:\s*space\.(\w+)/.exec(row)?.[1];
		assert.ok(margin, "no se encontró el margen de radiusRow");
		const px = Number(new RegExp(`\\b${margin}:\\s*(\\d+)`).exec(/export const space = \{([\s\S]*?)\}/.exec(design)?.[1] ?? "")?.[1]);
		assert.ok(px > 0, `no se encontró space.${margin}`);
		const border = 2; // el borde de 1 px de cada lado del control
		const perOption = (360 - 2 * px - border) / RADIUS_OPTIONS_KM.length;
		console.log(`       a 360 dp: ${perOption.toFixed(1)} dp por opción (margen ${px} dp)`);
		assert.ok(perOption >= 44, `${perOption.toFixed(1)} dp < 44`);
		assert.match(segment, /minHeight:\s*44/);
	});

	if (failures > 0) {
		console.log(`\n${failures} check(s) failed.`);
		process.exit(1);
	}
	console.log("\nAll checks passed.");
}

main();
