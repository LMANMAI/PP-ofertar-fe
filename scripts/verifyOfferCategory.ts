/**
 * La categoria de la oferta en las cards de "Ofertas para vos".
 *
 *   npx tsx scripts/verifyOfferCategory.ts
 *
 * La queja que motiva esto: la card mostraba el descuento, la cadena, el precio
 * y la vigencia, pero no de que categoria era la oferta, asi que para saberlo
 * habia que abrir oferta por oferta. La categoria si estaba en el dato —el tipo
 * `Offer` la trae— y hasta se pintaba, pero colgada de la linea de marca
 * (`marca · categoria`): una oferta sin marca la escondia del todo.
 *
 * Se verifican las dos mitades, porque cualquiera de las dos sola no alcanza:
 *   1. `offerCategoryLabel` decide bien cuando hay categoria que mostrar —es lo
 *      unico ejercitable de verdad desde Node—;
 *   2. la card efectivamente la renderiza, y la renderiza sola, sin depender de
 *      que la oferta tenga marca (chequeos sobre el fuente: es JSX de React
 *      Native y no se puede montar desde acá).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ALL_CATEGORIES, offerCategoryLabel } from "../src/services/offersApi";

const here = dirname(fileURLToPath(import.meta.url));
const src = (...p: string[]) => readFileSync(resolve(here, "..", ...p), "utf8");

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

console.log("offerCategoryLabel: cuando hay categoria que mostrar");

check("una categoria normal se muestra tal cual", () => {
	assert.equal(offerCategoryLabel("Almacén"), "Almacén");
});

check("no se le toca el texto ni la capitalizacion", () => {
	// El detalle la pinta cruda en su fila "Categoría" y el filtro la lista
	// cruda tambien. Capitalizar o traducir solo acá haria que la card diga una
	// cosa y el detalle otra sobre la misma oferta.
	assert.equal(offerCategoryLabel("bebidas sin alcohol"), "bebidas sin alcohol");
	assert.equal(offerCategoryLabel("LACTEOS"), "LACTEOS");
});

check("null no es una categoria", () => {
	assert.equal(offerCategoryLabel(null), null);
});

check("undefined tampoco", () => {
	// Por si llega una oferta armada por un backend viejo, sin el campo.
	assert.equal(offerCategoryLabel(undefined), null);
});

check("el string vacio del folleto no dibuja un chip vacio", () => {
	// Caso real, no defensivo: los productos de folleto (Makro, y los folletos
	// de Dia y Jumbo) los arma el scraper leyendo una imagen, de donde no hay
	// categoria que sacar. Es una porcion del catalogo, no un borde raro.
	assert.equal(offerCategoryLabel(""), null);
});

check("los espacios solos tampoco", () => {
	assert.equal(offerCategoryLabel("   "), null);
	assert.equal(offerCategoryLabel("\t\n"), null);
});

check("ALL_CATEGORIES no se pinta como si fuera una categoria", () => {
	// "Todas" es el rotulo de "sin filtrar" del filtro, no una categoria del
	// catalogo: OffersScreen ya lo saca de knownCategories. Si igual se colara
	// en offer.category, la card diria que la oferta es "de la categoria Todas".
	assert.equal(offerCategoryLabel(ALL_CATEGORIES), null);
});

check("ALL_CATEGORIES tampoco con otra caja o con espacios", () => {
	assert.equal(offerCategoryLabel("todas"), null);
	assert.equal(offerCategoryLabel("  TODAS  "), null);
});

check("una categoria que solo empieza igual si se muestra", () => {
	// La red que atrapa un filtro hecho con startsWith/includes en vez de una
	// comparacion exacta: "Todas las bebidas" es una categoria como cualquier
	// otra y tiene que sobrevivir.
	assert.equal(offerCategoryLabel("Todas las bebidas"), "Todas las bebidas");
});

check("se recortan los espacios de los costados", () => {
	// Si no, el chip queda con un aire asimetrico que parece un bug de padding.
	assert.equal(offerCategoryLabel(" Almacén "), "Almacén");
});

console.log("\nLa card de OffersScreen la renderiza");

const screen = src("src", "screens", "OffersScreen.tsx");

check("la card decide con offerCategoryLabel y no por su cuenta", () => {
	// Si la logica vuelve a vivir inline en el JSX, los chequeos de arriba dejan
	// de cubrir lo que realmente corre en pantalla.
	assert.match(screen, /const category = offerCategoryLabel\(offer\.category\)/);
	assert.match(screen, /import \{[^}]*offerCategoryLabel[^}]*\} from "\.\.\/services"/);
});

check("el chip se dibuja con el valor ya filtrado", () => {
	assert.match(screen, /styles\.categoryChip/);
	assert.match(screen, /\{category !== null && \(/);
});

check("sin categoria no se dibuja nada", () => {
	// El chip cuelga de `category !== null`, y la fila entera de metadatos solo
	// existe si hay categoria o vigencia: una oferta de folleto sin ninguna de
	// las dos no deja una fila vacia ocupando alto.
	assert.match(screen, /\{\(category !== null \|\| until !== null\) && \(/);
});

check("la categoria ya no cuelga de que haya marca", () => {
	// El bug original: se pintaba como `marca · categoria`, asi que una oferta
	// sin marca no mostraba categoria aunque la tuviera.
	assert.ok(
		!/offer\.category \? ` · \$\{offer\.category\}`/.test(screen),
		"la categoria volvio a colgar de la linea de marca",
	);
});

check("el chip se anuncia con el mismo rotulo que el detalle", () => {
	// OfferDetailScreen la nombra "Categoría" en sus detailRows. El chip visible
	// dice solo el valor —el icono da el contexto—, asi que el lector de
	// pantalla necesita el rotulo explicito o lee una palabra suelta.
	assert.match(screen, /accessibilityLabel=\{`Categoría: \$\{category\}`\}/);
	assert.match(
		src("src", "screens", "OfferDetailScreen.tsx"),
		/label: "Categoría", value: offer\.category/,
	);
});

check("el chip usa tokens del design system y no hex sueltos", () => {
	// Lo que lo hace sobrevivir el tema oscuro: `background` y `divider` cambian
	// con la paleta, un "#F8FAFC" hardcodeado no.
	const estilo = screen.match(/categoryChip:\s*\{[^}]*\}/)?.[0];
	assert.ok(estilo, "no encontre el estilo categoryChip");
	assert.match(estilo, /backgroundColor:\s*colors\./);
	assert.match(estilo, /borderColor:\s*colors\./);
	assert.ok(!/#[0-9A-Fa-f]{3,8}/.test(estilo), "categoryChip tiene un color hardcodeado");

	const texto = screen.match(/categoryChipText:\s*\{[^}]*\}/)?.[0];
	assert.ok(texto, "no encontre el estilo categoryChipText");
	assert.match(texto, /color:\s*colors\./);
	assert.ok(!/#[0-9A-Fa-f]{3,8}/.test(texto), "categoryChipText tiene un color hardcodeado");
});

check("el chip no se come el renglon cuando la categoria es larga", () => {
	// Sin numberOfLines/flexShrink una categoria larga empuja la vigencia fuera
	// de la card en el layout de tablet, que va a dos columnas.
	assert.match(screen, /style=\{styles\.categoryChipText\}\s*numberOfLines=\{1\}/);
	assert.match(screen.match(/categoryChip:\s*\{[^}]*\}/)?.[0] ?? "", /flexShrink:\s*1/);
	assert.match(screen.match(/offerMetaRow:\s*\{[^}]*\}/)?.[0] ?? "", /flexWrap:\s*"wrap"/);
});

check("la card sigue sin crear closures nuevas por render", () => {
	// OfferCard esta memoizada y recibe `onOpenOffer` + la oferta justamente
	// para que sus props no cambien de identidad en cada render de la lista.
	// `offerCategoryLabel` es una funcion de modulo, no una closure: si alguien
	// la reemplaza por un `useCallback` mal puesto o por una prop nueva armada
	// inline en renderItem, el memo se apaga para todas las cards.
	// `[\s\S]*?` y no `[^>]*`: una closure trae su propia `=>`, o sea un `>`, y
	// con `[^>]*` el match fallaba de casualidad y reportaba "no encontre el uso
	// de <OfferCard />" en vez del problema real.
	const renderItem = screen.match(/<OfferCard[\s\S]*?\/>/)?.[0];
	assert.ok(renderItem, "no encontre el uso de <OfferCard />");
	assert.ok(
		!/=>/.test(renderItem),
		`<OfferCard /> recibe una closure nueva por render: ${renderItem.trim()}`,
	);
});

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
