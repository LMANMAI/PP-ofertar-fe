/**
 * Que la app no gaste API de mapas por tecla ni llame a APIs web de Google.
 *
 *   npx tsx scripts/verifyMapsApiUsage.ts
 *
 * Hoy: la búsqueda de direcciones es al confirmar (`onSubmitEditing` / botón) y
 * va por `Location.geocodeAsync` de expo-location, el geocoder nativo del
 * sistema, sin la key de la app. La key de `app.json` es la del SDK de Maps para
 * Android que usa react-native-maps. Este chequeo lee el código de `src/` con el
 * parser de TypeScript (no con regex sobre el texto, así un comentario no cuenta)
 * y falla si:
 *
 *   1. aparece una URL de las APIs web de Google Maps (maps.googleapis.com,
 *      places.googleapis.com, /maps/api/place…) o un paquete de Places;
 *   2. `geocodeAsync`, `reverseGeocodeAsync`, `findPlace`, `describePoint` (o una
 *      función que las llame, en cualquier archivo) se llaman desde un
 *      `onChangeText`/`onChange` sin un `setTimeout`/debounce de ≥ 500 ms;
 *   3. un `useEffect` que depende de un estado que se escribe al tipear llama a
 *      esas funciones sin ese mismo debounce;
 *   4. un debounce de cualquier cosa está por debajo de 500 ms.
 *
 * El largo mínimo (4 caracteres) y descartar respuestas viejas no se pueden
 * verificar así; son parte del contrato para quien agregue sugerencias.
 *
 * Además corre "mutantes": fuentes deliberadamente rotas que tienen que ser
 * detectadas, y fuentes correctas que no. Si un mutante pasa, el script falla.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

const SRC = resolve(__dirname, "..", "src");
const MIN_DEBOUNCE_MS = 500;

/** Las que consultan un geocoder. Las que las envuelven se agregan solas. */
const SEEDS = ["geocodeAsync", "reverseGeocodeAsync", "findPlace", "describePoint"];

const BANNED_URLS: [RegExp, string][] = [
	[/maps\.googleapis\.com/i, "la API web de Google Maps"],
	[/places\.googleapis\.com/i, "la API web de Places"],
	[/\/maps\/api\/(place|geocode|directions|distancematrix|js)\b/i, "un endpoint de la API web de Google Maps"],
];
const BANNED_PACKAGES = /google-places|places-autocomplete|^@googlemaps\//i;

const TEXT_HANDLERS = new Set(["onChangeText", "onChange"]);

type Violation = string;

// --------------------------------------------------------------- utilidades

function parse(fileName: string, text: string): ts.SourceFile {
	return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function walk(node: ts.Node, visit: (n: ts.Node) => void): void {
	visit(node);
	node.forEachChild((child) => walk(child, visit));
}

function calleeName(call: ts.CallExpression): string | null {
	const e = call.expression;
	if (ts.isIdentifier(e)) return e.text;
	if (ts.isPropertyAccessExpression(e)) return e.name.text;
	return null;
}

function line(sf: ts.SourceFile, node: ts.Node): number {
	return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

/** Funciones con nombre del archivo: declaraciones y `const x = () => …`. */
function namedFunctions(sf: ts.SourceFile): Map<string, ts.Node> {
	const out = new Map<string, ts.Node>();
	walk(sf, (n) => {
		if (ts.isFunctionDeclaration(n) && n.name && n.body) out.set(n.name.text, n.body);
		if (
			ts.isVariableDeclaration(n) &&
			ts.isIdentifier(n.name) &&
			n.initializer &&
			(ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))
		) {
			out.set(n.name.text, n.initializer.body);
		}
		// useCallback(async () => …, deps)
		if (
			ts.isVariableDeclaration(n) &&
			ts.isIdentifier(n.name) &&
			n.initializer &&
			ts.isCallExpression(n.initializer) &&
			calleeName(n.initializer) === "useCallback"
		) {
			const fn = n.initializer.arguments[0];
			if (fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) out.set(n.name.text, fn.body);
		}
	});
	return out;
}

function exportedNames(sf: ts.SourceFile): Set<string> {
	const out = new Set<string>();
	for (const st of sf.statements) {
		const exported = ts.canHaveModifiers(st) && ts.getModifiers(st)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
		if (!exported) continue;
		if (ts.isFunctionDeclaration(st) && st.name) out.add(st.name.text);
		if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) out.add(d.name.text);
	}
	return out;
}

function callsAny(body: ts.Node, names: Set<string>): boolean {
	let found = false;
	walk(body, (n) => {
		if (!found && ts.isCallExpression(n)) {
			const name = calleeName(n);
			if (name && names.has(name)) found = true;
		}
	});
	return found;
}

/** Cierra `names` con las funciones de `functions` que llaman a alguna. */
function closeOver(names: Set<string>, functions: Map<string, ts.Node>): Set<string> {
	const out = new Set(names);
	for (let changed = true; changed; ) {
		changed = false;
		for (const [name, body] of functions) {
			if (!out.has(name) && callsAny(body, out)) {
				out.add(name);
				changed = true;
			}
		}
	}
	return out;
}

/** El valor en ms de un argumento de retardo, o null si no se puede leer. */
function delayMs(arg: ts.Expression | undefined, sf: ts.SourceFile): number | null {
	if (!arg) return 0;
	if (ts.isNumericLiteral(arg)) return Number(arg.text.replace(/_/g, ""));
	if (ts.isIdentifier(arg)) {
		let value: number | null = null;
		walk(sf, (n) => {
			if (
				ts.isVariableDeclaration(n) &&
				ts.isIdentifier(n.name) &&
				n.name.text === arg.text &&
				n.initializer &&
				ts.isNumericLiteral(n.initializer)
			) {
				value = Number(n.initializer.text.replace(/_/g, ""));
			}
		});
		return value;
	}
	return null;
}

const isDebounceCall = (call: ts.CallExpression) => {
	const name = calleeName(call);
	return name === "setTimeout" || (name != null && /debounce/i.test(name));
};

/**
 * Llamadas a `names` dentro de `root` que no están envueltas en un
 * setTimeout/debounce de ≥ 500 ms (entre la llamada y `root`).
 */
function undebouncedCalls(root: ts.Node, names: Set<string>, sf: ts.SourceFile): { name: string; node: ts.Node; why: string }[] {
	const out: { name: string; node: ts.Node; why: string }[] = [];
	walk(root, (n) => {
		if (!ts.isCallExpression(n)) return;
		const name = calleeName(n);
		if (!name || !names.has(name)) return;
		let why = "sin debounce";
		for (let p: ts.Node | undefined = n.parent; p && p !== root.parent; p = p.parent) {
			if (
				(ts.isArrowFunction(p) || ts.isFunctionExpression(p)) &&
				p.parent &&
				ts.isCallExpression(p.parent) &&
				isDebounceCall(p.parent) &&
				p.parent.arguments[0] === p
			) {
				const ms = delayMs(p.parent.arguments[1], sf);
				if (ms != null && ms >= MIN_DEBOUNCE_MS) return;
				why = ms == null ? "con un retardo que no se puede leer" : `con un debounce de ${ms} ms (< ${MIN_DEBOUNCE_MS})`;
				break;
			}
		}
		out.push({ name, node: n, why });
	});
	return out;
}

// ------------------------------------------------------------------ análisis

type Source = { name: string; text: string };

function analyze(sources: Source[]): { violations: Violation[]; handlers: number; geocoders: Set<string> } {
	const violations: Violation[] = [];
	const parsed = sources.map((s) => ({ name: s.name, sf: parse(s.name, s.text) }));

	// Nombres que consultan un geocoder, a través de archivos (por lo exportado).
	let global = new Set(SEEDS);
	for (let changed = true; changed; ) {
		changed = false;
		for (const { sf } of parsed) {
			const local = closeOver(global, namedFunctions(sf));
			for (const name of exportedNames(sf)) {
				// Un componente (con mayúscula) no se llama como función: que adentro
				// tenga una búsqueda no lo vuelve una.
				if (/^[A-Z]/.test(name)) continue;
				if (local.has(name) && !global.has(name)) {
					global = new Set([...global, name]);
					changed = true;
				}
			}
		}
	}

	let handlers = 0;
	const geocoders = new Set(global);
	for (const { name: file, sf } of parsed) {
		const functions = namedFunctions(sf);
		const names = closeOver(global, functions);
		for (const n of names) geocoders.add(n);

		// 1. URLs y paquetes prohibidos: sólo en código (strings, imports), no en comentarios.
		walk(sf, (n) => {
			if (ts.isStringLiteralLike(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
				const text = n.text;
				if (ts.isStringLiteral(n) && ts.isImportDeclaration(n.parent) && BANNED_PACKAGES.test(text)) {
					violations.push(`${file}:${line(sf, n)} importa "${text}" (Places / API web de Google)`);
					return;
				}
				for (const [re, what] of BANNED_URLS) {
					if (re.test(text)) violations.push(`${file}:${line(sf, n)} usa ${what}: "${text.slice(0, 60)}"`);
				}
			}
		});

		// 2. Handlers de texto que geocodifican sin debounce.
		const typedState = new Set<string>();
		const setters = new Map<string, string>();
		walk(sf, (n) => {
			if (
				ts.isVariableDeclaration(n) &&
				ts.isArrayBindingPattern(n.name) &&
				n.initializer &&
				ts.isCallExpression(n.initializer) &&
				calleeName(n.initializer) === "useState"
			) {
				const [value, setter] = n.name.elements;
				if (value && setter && ts.isBindingElement(value) && ts.isBindingElement(setter) && ts.isIdentifier(value.name) && ts.isIdentifier(setter.name)) {
					setters.set(setter.name.text, value.name.text);
				}
			}
		});

		walk(sf, (n) => {
			if (!ts.isJsxAttribute(n) || !ts.isIdentifier(n.name) || !TEXT_HANDLERS.has(n.name.text)) return;
			const init = n.initializer;
			if (!init || !ts.isJsxExpression(init) || !init.expression) return;
			handlers++;
			const expr = init.expression;
			let body: ts.Node | null = null;
			if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) body = expr.body;
			else if (ts.isIdentifier(expr)) {
				if (names.has(expr.text)) {
					violations.push(`${file}:${line(sf, n)} ${n.name.text}={${expr.text}} consulta el geocoder por cada tecla`);
					return;
				}
				if (setters.has(expr.text)) typedState.add(setters.get(expr.text) as string);
				body = functions.get(expr.text) ?? null;
			}
			if (!body) return;
			for (const c of undebouncedCalls(body, names, sf)) {
				violations.push(`${file}:${line(sf, c.node)} ${n.name.text} llama a ${c.name}() ${c.why}`);
			}
			walk(body, (m) => {
				if (ts.isCallExpression(m)) {
					const callee = calleeName(m);
					if (callee && setters.has(callee)) typedState.add(setters.get(callee) as string);
				}
			});
		});

		// 3. Efectos que dependen de lo tipeado.
		walk(sf, (n) => {
			if (!ts.isCallExpression(n) || calleeName(n) !== "useEffect") return;
			const [fn, deps] = n.arguments;
			if (!fn || !deps || !ts.isArrayLiteralExpression(deps)) return;
			const dependsOnTyping = deps.elements.some((d) => ts.isIdentifier(d) && typedState.has(d.text));
			if (!dependsOnTyping) return;
			for (const c of undebouncedCalls(fn, names, sf)) {
				violations.push(`${file}:${line(sf, c.node)} un useEffect sobre lo tipeado llama a ${c.name}() ${c.why}`);
			}
		});

		// 4. Ningún debounce por debajo del mínimo.
		walk(sf, (n) => {
			if (!ts.isCallExpression(n)) return;
			const name = calleeName(n);
			if (!name || !/debounce/i.test(name) || n.arguments.length < 2) return;
			const ms = delayMs(n.arguments[1], sf);
			if (ms == null || ms < MIN_DEBOUNCE_MS) {
				violations.push(`${file}:${line(sf, n)} ${name}() con ${ms == null ? "un retardo ilegible" : `${ms} ms`} (< ${MIN_DEBOUNCE_MS})`);
			}
		});
	}
	return { violations, handlers, geocoders };
}

// ------------------------------------------------------------------ mutantes

const HEADER = `import { useEffect, useState } from "react";\nimport { TextInput } from "react-native";\nimport * as Location from "expo-location";\nimport { findPlace, describePoint } from "../location/searchOrigin";\n`;

const MUTANTS: { name: string; source: string }[] = [
	{
		name: "findPlace en onChangeText",
		source: `${HEADER}export function S() { const [q, setQ] = useState(""); return <TextInput value={q} onChangeText={(t) => { setQ(t); findPlace(t); }} />; }`,
	},
	{
		name: "un handler con nombre que geocodifica",
		source: `${HEADER}export function S() { const onType = (t: string) => { Location.geocodeAsync(t); }; return <TextInput onChangeText={onType} />; }`,
	},
	{
		name: "una función envoltorio (en otro archivo) llamada por tecla",
		source: `${HEADER}import { suggest } from "./wrapper";\nexport function S() { return <TextInput onChangeText={(t) => suggest(t)} />; }`,
	},
	{
		name: "debounce demasiado corto (300 ms)",
		source: `${HEADER}export function S() { return <TextInput onChangeText={(t) => setTimeout(() => findPlace(t), 300)} />; }`,
	},
	{
		name: "useEffect sobre el texto tipeado, sin debounce",
		source: `${HEADER}export function S() { const [q, setQ] = useState(""); useEffect(() => { findPlace(q); }, [q]); return <TextInput value={q} onChangeText={setQ} />; }`,
	},
	{
		name: "reverseGeocodeAsync en onChange",
		source: `${HEADER}export function S() { return <TextInput onChange={() => Location.reverseGeocodeAsync({ latitude: 0, longitude: 0 })} />; }`,
	},
	{
		name: "fetch a la API web de Places",
		source: `${HEADER}export const x = () => fetch(\`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=\${"a"}\`);`,
	},
	{
		name: "paquete de autocompletado de Places",
		source: `import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";\nexport const y = GooglePlacesAutocomplete;`,
	},
	{
		name: "useDebounce de 200 ms",
		source: `${HEADER}declare function useDebounce<T>(v: T, ms: number): T;\nexport function S() { const [q] = useState(""); const d = useDebounce(q, 200); return d; }`,
	},
];

const WRAPPER: Source = {
	name: "mutante/wrapper.ts",
	text: `import { findPlace } from "../location/searchOrigin";\nexport async function suggest(t: string) { return findPlace(t); }`,
};

const GOOD: { name: string; source: string }[] = [
	{
		name: "guardar el texto al tipear y buscar al confirmar",
		source: `${HEADER}export function S() { const [q, setQ] = useState(""); return <TextInput value={q} onChangeText={(t) => setQ(t)} onSubmitEditing={() => findPlace(q)} />; }`,
	},
	{
		name: "sugerencias con debounce de 600 ms, mínimo 4 letras",
		source: `${HEADER}const WAIT = 600;\nexport function S() { const [q, setQ] = useState(""); useEffect(() => { if (q.trim().length < 4) return; const id = setTimeout(() => { findPlace(q); }, WAIT); return () => clearTimeout(id); }, [q]); return <TextInput value={q} onChangeText={setQ} />; }`,
	},
	{
		name: "el enlace de navegación de Google Maps (no es la API)",
		source: `export const u = "https://www.google.com/maps/dir/?api=1&destination=1,2";`,
	},
	{
		name: "un comentario que nombra la API no cuenta",
		source: `// nunca maps.googleapis.com\nexport const z = 1;`,
	},
	{
		name: "tocar el mapa con el timer de siempre (no es tipeo)",
		source: `${HEADER}export function S() { const onPress = () => setTimeout(() => describePoint(0, 0), 250); return <TextInput onFocus={onPress} />; }`,
	},
];

// ------------------------------------------------------------------- harness

function listSources(dir: string): Source[] {
	const out: Source[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) out.push(...listSources(full));
		else if (/\.(tsx?|jsx?)$/.test(entry)) out.push({ name: relative(resolve(SRC, ".."), full).replace(/\\/g, "/"), text: readFileSync(full, "utf8") });
	}
	return out;
}

function main() {
	let failed = false;

	console.log("\n[1] El código de src/");
	const real = analyze(listSources(SRC));
	console.log(`   ${real.handlers} handlers de texto revisados`);
	console.log(`   funciones que consultan un geocoder: ${[...real.geocoders].filter((n) => /^[a-z]/.test(n)).sort().join(", ")}`);
	// Si el análisis dejara de ver lo que hay, pasaría sin revisar nada.
	for (const expected of ["findPlace", "describePoint", "handleSearch"]) {
		if (!real.geocoders.has(expected)) {
			console.log(`   FALLA: el análisis no reconoce ${expected} como consulta al geocoder: está ciego`);
			failed = true;
		}
	}
	if (real.handlers === 0) {
		console.log("   FALLA: no encontró ningún onChangeText: está ciego");
		failed = true;
	}
	if (real.violations.length === 0) console.log("   OK");
	for (const v of real.violations) {
		console.log(`   FALLA: ${v}`);
		failed = true;
	}

	console.log("\n[2] Mutantes: el uso indebido tiene que ser detectado");
	for (const m of MUTANTS) {
		const found = analyze([{ name: "mutante/S.tsx", text: m.source }, WRAPPER]).violations;
		if (found.length === 0) {
			console.log(`   NO DETECTADO: ${m.name}`);
			failed = true;
		} else {
			console.log(`   detectado: ${m.name}`);
			console.log(`      -> ${found[0]}`);
		}
	}

	console.log("\n[3] Usos correctos: no tienen que marcarse");
	for (const g of GOOD) {
		const found = analyze([{ name: "correcto/S.tsx", text: g.source }]).violations;
		if (found.length > 0) {
			console.log(`   FALSO POSITIVO: ${g.name}`);
			console.log(`      -> ${found[0]}`);
			failed = true;
		} else {
			console.log(`   ok: ${g.name}`);
		}
	}

	console.log(failed ? "\nRESULTADO: FALLÓ" : "\nRESULTADO: OK");
	if (failed) process.exitCode = 1;
}

main();
