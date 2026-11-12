/**
 * Que `expo-notifications` siga cargándose de forma diferida.
 *
 *   npx tsx scripts/verifyNotificationsExpoGo.ts
 *
 * Importar `expo-notifications` en Expo Go (Android) lanza al evaluar el módulo:
 * su auto-registro top-level llama a `addPushTokenListener`, que rechaza Expo Go
 * desde el SDK 53. Por eso el módulo sólo se importa dentro de
 * `src/notifications/loadNotifications.ts`, detrás de `isRunningInExpoGo()`, y
 * el resto de la app lo pide con `loadNotifications()`.
 *
 * El chequeo detecta una regresión en la que alguien vuelva a importarlo arriba
 * de todo en otro archivo (la app dejaría de arrancar en Expo Go) o borre la
 * guarda de los dos consumidores.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const srcDir = resolve(root, "src");

let failures = 0;
function check(name: string, fn: () => void): void {
	try {
		fn();
		console.log(`  ok   ${name}`);
	} catch (err) {
		failures++;
		console.log(`  FAIL ${name}`);
		console.log(`       ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
	}
}

function walk(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path, out);
		else if (/\.(ts|tsx)$/.test(name)) out.push(path);
	}
	return out;
}

const LOADER = resolve(srcDir, "notifications", "loadNotifications.ts");
const files = walk(srcDir);
const read = (path: string) => readFileSync(path, "utf8");

console.log("El cargador diferido");

check("existe y sale de Expo Go antes de importar el módulo", () => {
	const code = read(LOADER);
	assert.match(code, /isRunningInExpoGo\(\)/, "loadNotifications.ts no consulta isRunningInExpoGo()");
	assert.match(code, /import\(\s*["']expo-notifications["']\s*\)/, "no importa expo-notifications de forma diferida");
});

console.log("\nNadie más lo importa de forma estática");

check("ningún archivo de src/ lo importa arriba de todo", () => {
	const offenders = files
		.filter((f) => f !== LOADER)
		.filter((f) => {
			const code = read(f);
			return (
				/^\s*import\s+(?!type\s)[^;]*?from\s+["']expo-notifications["']/m.test(code) ||
				/require\(\s*["']expo-notifications["']\s*\)/.test(code)
			);
		})
		.map((f) => relative(root, f));
	assert.deepEqual(offenders, [], `importan expo-notifications de forma estática: ${offenders.join(", ")}`);
});

console.log("\nLos consumidores pasan por el cargador");

check("pushRegistration.ts sale en Expo Go antes de tocar el módulo", () => {
	const code = read(resolve(srcDir, "notifications", "pushRegistration.ts"));
	assert.match(code, /if \(!canUsePush\(\)\) return "expoGo";/, "no corta antes de cargar expo-notifications");
	assert.match(code, /await loadNotifications\(\)/, "no carga el módulo con loadNotifications()");
});

check("useNotificationTaps.ts no registra nada en Expo Go", () => {
	const code = read(resolve(srcDir, "hooks", "useNotificationTaps.ts"));
	assert.match(code, /if \(!canUsePush\(\)\) return;/, "no corta antes de cargar expo-notifications");
	assert.match(code, /loadNotifications\(\)/, "no carga el módulo con loadNotifications()");
	assert.match(code, /cancelled/, "la suscripción asíncrona no se cancela al desmontar");
});

// Al mergear main (seguir productos, #29) contra la versión diferida, quedarse con
// un lado entero compila igual pero el aviso de un producto seguido cae en Home.
check("useNotificationTaps.ts lleva el aviso de productos seguidos a su pantalla", () => {
	const code = read(resolve(srcDir, "hooks", "useNotificationTaps.ts"));
	assert.match(
		code,
		/data\.screen === "followedProducts"\)\s*\{[^}]*nav\.push\("FollowedProducts"\)/,
		'no maneja data.screen === "followedProducts"',
	);
});

console.log("\nEl toast de seguir no promete avisos en Expo Go");

check('followScannedProduct maneja el resultado "expoGo"', () => {
	const code = read(resolve(srcDir, "navigation", "actions.ts"));
	assert.match(code, /push === "expoGo"/, 'followScannedProduct no distingue "expoGo" y diría "Te avisamos"');
});

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
