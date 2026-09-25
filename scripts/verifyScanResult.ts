/**
 * El resultado de escanear un código de barras, acotado a las tiendas favoritas.
 *
 *   npx tsx scripts/verifyScanResult.ts
 *
 * Lo que tiene que cumplirse:
 *   - con favoritas elegidas, el mínimo sale sólo de esas cadenas;
 *   - SEPA llama distinto a algunas cadenas (Cencosud, Maxi) y aun así coinciden;
 *   - una estación de servicio nunca cuenta como súper;
 *   - sin favoritas, o sin poder leerlas, no se inventa un recorte;
 *   - la fecha de SEPA se lee como día local, no como medianoche UTC.
 */
import assert from "node:assert/strict";

import { directionsUrl } from "../src/utils/directions";
import {
	describeDatasetDate,
	findPurchase,
	parseShelfPrice,
	scopeBranches,
	scopePrices,
	verdictFor,
} from "../src/utils/scanResult";
import type { ComercioPrecioResponse, SucursalPrecio } from "../src/services/sepaApi";
import type { StoreChain } from "../src/services/storesApi";
import type { RecurringProduct } from "../src/services";

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

const c = (bandera: string, min: number, extra: Partial<ComercioPrecioResponse> = {}): ComercioPrecioResponse => ({
	comercioId: "",
	bandera,
	razonSocial: null,
	precioMinimo: min,
	precioMaximo: min + 1000,
	cantidadSucursales: 10,
	...extra,
});

const CHAINS: StoreChain[] = [
	{ slug: "coto", name: "COTO" },
	{ slug: "carrefour", name: "Carrefour" },
	{ slug: "dia", name: "Supermercados DIA" },
	{ slug: "jumbo", name: "Jumbo" },
	{ slug: "lanonima", name: "La Anónima" },
];

const COCA = [
	c("Maxi", 3795),
	c("Unicoop", 4081),
	c("Cooperativa Obrera", 4660),
	c("Changomas", 4799),
	c("DIA", 4800),
	c("COTO", 5600),
	c("Axion Energy", 3000),
	c("DEHEZA S.A.I.C.F. e I.", 2900),
];

console.log("\nEl mínimo sale de las tiendas favoritas");

check("con favoritas, el mejor precio es el de la más barata de ellas", () => {
	const s = scopePrices(COCA, CHAINS, ["coto", "dia"]);
	assert.equal(s.mode, "favorites");
	assert.equal(s.best?.bandera, "DIA");
	assert.deepEqual(s.favorites.map((x) => x.bandera), ["DIA", "COTO"]);
});

check("el resto queda aparte, sin las que no son súper", () => {
	const s = scopePrices(COCA, CHAINS, ["coto"]);
	assert.ok(!s.others.some((x) => /Axion|DEHEZA/.test(x.bandera ?? "")));
	assert.equal(s.others[0].bandera, "Maxi");
});

check("Maxi cuenta como Carrefour", () => {
	const s = scopePrices(COCA, CHAINS, ["carrefour"]);
	assert.equal(s.best?.bandera, "Maxi");
});

check("Cencosud cuenta como Jumbo", () => {
	const s = scopePrices([c("Cencosud", 4200), c("COTO", 5000)], CHAINS, ["jumbo"]);
	assert.equal(s.best?.bandera, "Cencosud");
});

check("La Anónima se reconoce por el nombre aunque el slug no coincida", () => {
	const s = scopePrices([c("La Anónima", 4100)], CHAINS, ["lanonima"]);
	assert.equal(s.mode, "favorites");
});

check("ninguna favorita lo vende: no hay mejor precio propio, y se dice cuál es el de afuera", () => {
	const s = scopePrices(COCA, CHAINS, ["lanonima"]);
	assert.equal(s.mode, "none-in-favorites");
	assert.equal(s.best, null);
	assert.equal(s.otherBest?.bandera, "Maxi");
});

check("sin favoritas no se recorta nada", () => {
	const s = scopePrices(COCA, CHAINS, []);
	assert.equal(s.mode, "all");
	assert.equal(s.best?.bandera, "Maxi");
});

check("con favoritas pero sin poder leer las cadenas, tampoco se inventa un recorte", () => {
	const s = scopePrices(COCA, [], ["coto"]);
	assert.equal(s.mode, "all");
});

check("un comercio sin precio no cuenta", () => {
	const s = scopePrices([{ ...c("COTO", 0), precioMinimo: null }, c("DIA", 4800)], CHAINS, []);
	assert.equal(s.best?.bandera, "DIA");
});

console.log("\nEl veredicto y el precio tipeado");

check("igual o menos que el mínimo es bueno", () => {
	assert.equal(verdictFor(4800, 4800).tone, "good");
	assert.equal(verdictFor(4000, 4800).tone, "good");
});

check("hasta 10% arriba es cerca; más, arriba", () => {
	assert.equal(verdictFor(5000, 4800).tone, "near");
	assert.equal(verdictFor(6000, 4800).tone, "above");
	assert.equal(Math.round(verdictFor(6000, 4800).pct), 25);
});

check("el precio se lee como se escribe en Argentina", () => {
	assert.equal(parseShelfPrice("1.250,50"), 1250.5);
	assert.equal(parseShelfPrice("1250"), 1250);
	assert.equal(parseShelfPrice("1250.5"), 1250.5);
	assert.equal(parseShelfPrice("5.500"), 5500);
	assert.equal(parseShelfPrice("1.250.000"), 1250000);
	assert.equal(parseShelfPrice("12.5"), 12.5);
	assert.equal(parseShelfPrice(""), null);
	assert.equal(parseShelfPrice("abc"), null);
	assert.equal(parseShelfPrice("0"), null);
});

console.log("\nLa fecha y el historial");

check("la fecha de SEPA es un día local, no el día anterior", () => {
	const now = new Date(2026, 8, 24, 15, 0);
	const d = describeDatasetDate("2026-09-15", now);
	assert.equal(d?.days, 9);
	assert.match(d?.label ?? "", /^15 de septiembre · hace 9 días$/);
});

check("hoy y ayer se dicen como tales", () => {
	const now = new Date(2026, 8, 24, 15, 0);
	assert.match(describeDatasetDate("2026-09-24", new Date(now))?.label ?? "", /hoy$/);
	assert.match(describeDatasetDate("2026-09-23", new Date(now))?.label ?? "", /ayer$/);
});

check("sin fecha o con basura no hay fecha", () => {
	assert.equal(describeDatasetDate(null), null);
	assert.equal(describeDatasetDate("cualquier cosa"), null);
});

check("el código se encuentra con o sin ceros a la izquierda", () => {
	const p = { barcode: "0007790895000997", description: "x" } as RecurringProduct;
	assert.equal(findPurchase([p], "7790895000997"), p);
	assert.equal(findPurchase([p], "9999999999999"), null);
	assert.equal(findPurchase([{ barcode: null } as RecurringProduct], "7790895000997"), null);
});

console.log("\nLas sucursales cercanas y cómo llegar");

const b = (bandera: string, precio: number, distanciaKm: number, extra: Partial<SucursalPrecio> = {}): SucursalPrecio => ({
	comercioId: "1",
	banderaId: "1",
	bandera,
	sucursalId: 1,
	nombre: "Sucursal",
	tipo: "Supermercado",
	direccion: "Calle 100",
	localidad: "CABA",
	provincia: "AR-C",
	latitud: -34.6,
	longitud: -58.4,
	distanciaKm,
	precio,
	...extra,
});

const CERCA = [b("Maxi", 3795, 2.1), b("DIA", 4800, 0.4), b("COTO CICSA", 5600, 1.2), b("Axion Energy", 3000, 0.3)];

check("con favoritas, el mejor precio es el de la sucursal cercana de la más barata de ellas", () => {
	const s = scopeBranches(CERCA, CHAINS, ["coto", "dia"]);
	assert.equal(s.mode, "favorites");
	assert.equal(s.best?.bandera, "DIA");
	assert.deepEqual(s.favorites.map((x) => x.bandera), ["DIA", "COTO CICSA"]);
});

check("la estación de servicio no cuenta como súper ni aparece en el resto", () => {
	const s = scopeBranches(CERCA, CHAINS, ["coto"]);
	assert.ok(![...s.favorites, ...s.others].some((x) => /Axion/.test(x.bandera ?? "")));
});

check("Jumbo, Disco y Vea se reconocen por el nombre de cada sucursal", () => {
	const s = scopeBranches([b("Disco", 4000, 1), b("Jumbo", 4200, 2)], CHAINS, ["jumbo"]);
	assert.deepEqual(s.favorites.map((x) => x.bandera), ["Jumbo"]);
	assert.deepEqual(s.others.map((x) => x.bandera), ["Disco"]);
});

check("Market y Express cuentan como Carrefour", () => {
	const s = scopeBranches([b("Market", 4000, 1), b("Express", 4100, 1)], CHAINS, ["carrefour"]);
	assert.equal(s.favorites.length, 2);
});

check("a igual precio, primero la más cerca", () => {
	const s = scopeBranches([b("DIA", 4800, 3), b("COTO CICSA", 4800, 0.5)], CHAINS, []);
	assert.equal(s.best?.bandera, "COTO CICSA");
});

check("ninguna de las favoritas está cerca: se dice cuál es la más barata de las otras", () => {
	const s = scopeBranches(CERCA, CHAINS, ["lanonima"]);
	assert.equal(s.mode, "none-in-favorites");
	assert.equal(s.best, null);
	assert.equal(s.otherBest?.bandera, "Maxi");
});

check("el enlace de navegación usa Apple Maps en iOS y Google Maps en el resto", () => {
	assert.equal(directionsUrl("ios", -34.6, -58.4), "https://maps.apple.com/?daddr=-34.6,-58.4&dirflg=d");
	assert.equal(directionsUrl("android", -34.6, -58.4), "https://www.google.com/maps/dir/?api=1&destination=-34.6,-58.4");
	assert.equal(directionsUrl("web", -34.6, -58.4), "https://www.google.com/maps/dir/?api=1&destination=-34.6,-58.4");
});

if (failures > 0) {
	console.log(`\n${failures} check(s) failed.`);
	process.exit(1);
}
console.log("\nAll checks passed.");
