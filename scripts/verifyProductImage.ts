/**
 * The guard between a catalog field we do not control and the <Image> on a
 * "productos que comprás seguido" card.
 *
 *   npx tsx scripts/verifyProductImage.ts
 *
 * A bad URL does not throw: <Image> just draws nothing and leaves a hole where
 * the tile should be. So every shape that is not an absolute http(s) URL has
 * to be turned away here, before it gets that far.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { catalogImageUri } from "../src/utils/productImage";

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

console.log("catalogImageUri(): only an absolute http(s) URL reaches <Image>");

check("a real catalog photo passes through untouched", () => {
	const real = "https://carrefourar.vteximg.com.br/arquivos/ids/740784/7791720019054_E01.jpg?v=63896147128";
	assert.equal(catalogImageUri(real), real);
});

check("plain http is accepted too", () => {
	assert.equal(catalogImageUri("http://example.com/a.jpg"), "http://example.com/a.jpg");
});

check("the scheme is matched case-insensitively", () => {
	assert.equal(catalogImageUri("HTTPS://example.com/a.jpg"), "HTTPS://example.com/a.jpg");
});

check("surrounding whitespace is trimmed, not rejected", () => {
	assert.equal(catalogImageUri("  https://example.com/a.jpg  "), "https://example.com/a.jpg");
});

check("a backend that predates the field yields no photo", () => {
	// The app ships independently of the backend: the key is simply absent.
	assert.equal(catalogImageUri(undefined), null);
});

check("a product with no photo in the catalog yields no photo", () => {
	assert.equal(catalogImageUri(null), null);
});

check("an empty or blank string is not a URL", () => {
	assert.equal(catalogImageUri(""), null);
	assert.equal(catalogImageUri("   "), null);
});

check("a relative path is rejected: <Image> would fail silently on it", () => {
	assert.equal(catalogImageUri("/arquivos/ids/740784.jpg"), null);
	assert.equal(catalogImageUri("arquivos/ids/740784.jpg"), null);
});

check("other schemes are rejected", () => {
	assert.equal(catalogImageUri("data:image/png;base64,iVBORw0KGgo="), null);
	assert.equal(catalogImageUri("file:///tmp/a.jpg"), null);
	assert.equal(catalogImageUri("javascript:alert(1)"), null);
});

check("a non-string sneaking through an untyped payload is rejected", () => {
	assert.equal(catalogImageUri(42 as unknown as string), null);
	assert.equal(catalogImageUri({} as unknown as string), null);
});


console.log("");
console.log("El asset del placeholder existe y se llama como dice el codigo");

check("productPlaceholder.ts apunta a un archivo real, con la misma mayuscula", () => {
	// El require() de un PNG solo lo resuelve el bundler, asi que se lee el
	// archivo como texto: es la unica forma de comprobar la ruta desde Node. No
	// se usa existsSync contra la ruta directa porque Windows ignora las
	// mayusculas y Android no, y el error aparecería recien en el dispositivo.
	const moduleDir = resolve(__dirname, "..", "src", "theme");
	const source = readFileSync(resolve(moduleDir, "productPlaceholder.ts"), "utf8");
	const ref = source.match(/require\("([^"]+)"\)/)?.[1];
	assert.ok(ref, "productPlaceholder.ts no declara ningun require()");

	const full = resolve(moduleDir, ref as string);
	const base = (ref as string).split("/").pop() ?? "";
	const present = existsSync(dirname(full)) ? readdirSync(dirname(full)) : [];
	const near = present.find((f) => f.toLowerCase() === base.toLowerCase());
	assert.ok(
		present.includes(base),
		near
			? `el codigo dice "${base}" pero el archivo es "${near}": Android distingue mayusculas`
			: `no existe ${ref}`,
	);
});

check("el placeholder es un PNG valido y cuadrado", () => {
	// Se dibuja con resizeMode="contain" en un cuadro cuadrado: uno apaisado
	// entraria mas chico que el resto y las tarjetas se verian disparejas.
	const file = resolve(__dirname, "..", "assets", "product-placeholder.png");
	const bytes = readFileSync(file);
	assert.equal(bytes.readUInt32BE(0), 0x89504e47, "no es un PNG");
	const w = bytes.readUInt32BE(16);
	const h = bytes.readUInt32BE(20);
	assert.ok(Math.abs(w / h - 1) < 0.02, `deberia ser cuadrado, es ${w}x${h}`);
});


check("el placeholder llena el tile: su propio fondo es el unico", () => {
	// La ilustracion trae fondo blanco. Dibujarla reducida dejaba ese blanco
	// flotando sobre el fondo del tile, o sea dos blancos distintos con un
	// marco entre medio. Al llenarlo, su fondo pasa a ser el del tile y las
	// esquinas redondeadas lo recortan.
	const screen = readFileSync(resolve(__dirname, "..", "src", "screens", "HomeScreen.tsx"), "utf8");
	assert.ok(
		!/productPlaceholderImage/.test(screen),
		"el placeholder volvio a tener su propio tamano: deja ver un segundo fondo detras",
	);
	assert.ok(
		!/productTilePlaceholder/.test(screen),
		"el tile volvio a pintar un fondo propio detras de una imagen que ya trae el suyo",
	);
});

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
