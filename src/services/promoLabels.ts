import { describePromo, type PromoMechanic, type PromoWording } from "./offersApi";

/**
 * Qué promoción aplica, leída del texto que publica cada cadena.
 *
 * El problema que resuelve: el catálogo trae etiquetas de promo en texto libre
 * ("3X2", "2da Unid 70% DTO!!", "Tarjeta Carrefour 15%") y la app las mostraba
 * todas por igual, en un renglón chiquito, como si fueran lo mismo. No lo son:
 * un 3x2 es una mecánica del producto, un "Tarjeta Carrefour 15%" es un
 * descuento por medio de pago que el usuario sólo consigue si paga con esa
 * tarjeta. Presentar la segunda como "la promoción del producto" es mentir.
 *
 * Por qué se apoya en `describePromo` (offersApi) en vez de inventar un
 * vocabulario nuevo: la redacción de las mecánicas que YA existen —2x1, 3x2,
 * 2da unidad, % directo— tiene que ser la misma en la card de oferta que acá,
 * y ya se rompió una vez cuando hubo dos copias. Así que este módulo
 * **clasifica** (texto -> mecánica + cantidad) y delega la **redacción** en
 * `describePromo` siempre que la mecánica caiga dentro de `PromoMechanic`.
 *
 * Lo único que se redacta acá es lo que ese vocabulario genuinamente no puede
 * expresar, porque nació de campañas con OCR y no de etiquetas de góndola:
 *   - un NxM cualquiera ("4X3 / 4X2"), que no es ni 2x1 ni 3x2;
 *   - el descuento en la enésima unidad con n distinto de 2 ("3er Unid 50%");
 *   - el "Llevando N", donde el descuento va sobre el total y no sobre una
 *     unidad puntual.
 * `PromoMechanic` no se amplía a propósito: está documentado como espejo exacto
 * del `promoMechanic` del scraper, y agregarle casos que el scraper no emite lo
 * volvería mentira.
 */

/** Qué clase de promoción es la etiqueta. */
export type PromoLabelKind =
	/** Mecánica de producto con condición de cantidad. Lo que el usuario pidió ver. */
	| "quantity"
	/** Descuento porcentual directo sobre la unidad, sin condición. */
	| "percentage"
	/** Medio de pago: tarjeta, banco, cuotas, programas de la cadena. */
	| "payment"
	/** Hay algo, pero no pudimos leer qué. */
	| "unknown";

/** La forma de la condición de cantidad. Más fina que `PromoMechanic` porque
 * las etiquetas de góndola distinguen casos que las campañas no. */
export type PromoCondition =
	/** El descuento cae sobre la unidad número N ("2da Unid 70%", "2do al 50%"). */
	| "nth_unit"
	/** Llevás N, pagás M ("3X2", "4X3 / 4X2"). */
	| "nxm"
	/** Llevando N unidades, el descuento va sobre el total ("Llevando 6 (Hasta 30%)"). */
	| "bulk";

export interface PromoLabelReading {
	/** La etiqueta tal cual la mandó la cadena, sin normalizar. */
	label: string;
	kind: PromoLabelKind;
	condition: PromoCondition | null;
	/** Unidades que hay que llevar para que aplique. 1 = sin condición.
	 * Misma semántica que `requiredQuantity` en el scraper. */
	requiredQuantity: number;
	/** Unidades que se pagan en un NxM. Null fuera de ese caso. */
	paidUnits: number | null;
	/** El porcentaje que anuncia la etiqueta, si lo dice. */
	percentage: number | null;
	/** La etiqueta misma dice "hasta", o anuncia más de un porcentaje/mecánica. */
	capped: boolean;
	/** La etiqueta nombra un medio de pago, un banco o un programa de la cadena
	 * — independientemente de cómo haya quedado clasificada.
	 *
	 * Con `kind: "payment"` es redundante. Sirve para el otro caso: una mecánica
	 * de cantidad que ADEMÁS pide una tarjeta ("2da Unid 70% con Tarjeta
	 * Carrefour"). Ahí gana la mecánica, porque es lo que el usuario preguntó,
	 * pero la condición de pago se sigue sabiendo y se dice en el `detail`. */
	paymentHint: boolean;
	/** La mecánica en el vocabulario de campañas, cuando la etiqueta cae justo
	 * en uno de sus cuatro casos. Null no significa "no hay mecánica": significa
	 * que `describePromo` no sabe redactarla y la redacta este módulo. */
	mechanic: PromoMechanic | null;
}

/**
 * Pistas de medio de pago.
 *
 * Se chequea ANTES que cualquier otra cosa porque casi todas traen un
 * porcentaje adentro: "Tarjeta Carrefour 15%" leído como porcentaje suelto se
 * convierte en "15% de descuento" y el usuario va al súper esperando pagar 15%
 * menos con cualquier medio de pago.
 *
 * "MI CRF" y "DOBLE PRECIO" son los nombres propios de los programas de
 * Carrefour; sin ellos, `PROMO-Mi CRF -mfl-1-7-Dto de 7% Doble Precio` —que es
 * el 100% de lo que manda esa cadena— se colaría como mecánica de producto.
 *
 * Sobre los nombres de banco. Van con `\b` de los dos lados a propósito:
 * "NACION" sin bordes se come "NACIONAL", que es una palabra normal en una
 * góndola argentina. MACRO y PATAGONIA no están sueltos y sólo se alcanzan por
 * "BANCO": "Patagonia" es una cerveza y una región antes que un banco, y
 * "Macro" está a una letra de Makro, que es una de las cadenas del feed.
 * "Banco Macro 30%" igual queda cubierto, porque "BANCO" matchea solo.
 *
 * Sobre "COMUNIDAD". COTO manda "Miembros Comunidad" y se decidió tratarlo como
 * medio de pago (ver `hasOnlyDiscountWords` para la alternativa que se
 * descartó): el descuento no está en la góndola para cualquiera, hay que ser
 * socio y presentar la credencial en la caja. Del lado del usuario es la misma
 * clase de condición que una tarjeta —"no lo conseguís yendo y pagando
 * normal"—, y el balde de medio de pago es el único lugar de la UI que dice
 * justamente eso. La alternativa era dejarlo en `unknown`, que también es
 * honesta, pero lo muestra crudo y sin explicar por qué no le baja el precio.
 */
const PAYMENT_HINTS = new RegExp(
	[
		// La palabra que ya dice sola que hay una condición de pago.
		"TARJETA",
		"BANCO",
		"BANCARI",
		"CUOTA",
		"MEDIO DE PAGO",
		"PAGANDO CON",
		"DEBITO",
		"CREDITO",
		// "Ahora 12", "Ahora 18". El dígito es parte del nombre del plan.
		"AHORA \\d",
		// Marcas de tarjeta y billeteras.
		"VISA",
		"MASTERCARD",
		"MAESTRO",
		"AMERICAN EXPRESS",
		"AMEX",
		"CABAL",
		"NARANJA",
		"MERCADO PAGO",
		"\\bMODO\\b",
		"\\bUALA\\b",
		"BRUBANK",
		// Bancos por nombre propio, para las etiquetas que no escriben "Banco".
		"GALICIA",
		"SANTANDER",
		"BBVA",
		"\\bICBC\\b",
		"\\bHSBC\\b",
		"SUPERVIELLE",
		"CREDICOOP",
		"\\bPROVINCIA\\b",
		"\\bCIUDAD\\b",
		"\\bNACION\\b",
		// Cuenta DNI (Banco Provincia), que en la góndola aparece así y nada más.
		"CUENTA DNI",
		"\\bDNI\\b",
		// Programas de fidelidad de cadena: no son medio de pago en sentido
		// estricto, pero comparten lo único que importa acá — el precio de
		// góndola no baja para quien no está adentro del programa.
		"MI CRF",
		"MI CARREFOUR",
		"DOBLE PRECIO",
		"COMUNIDAD",
		"CLARIN 365",
	].join("|"),
);

/** Mayúsculas y sin acentos, para que "DÉBITO" y "DEBITO" sean la misma cosa. */
function normalize(text: string): string {
	return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

/**
 * El vocabulario que una etiqueta puede usar para decir "descuento" y nada más.
 *
 * Todo lo demás es un nombre propio o una condición: un día de la semana, un
 * banco, un programa, una cantidad mínima escrita en prosa.
 */
const DISCOUNT_WORDS = new Set([
	"HASTA",
	"DTO",
	"DTOS",
	"DCTO",
	"DESC",
	"DESCUENTO",
	"DESCUENTOS",
	"OFF",
	"AHORRO",
	"REBAJA",
	"PROMO",
	"PROMOCION",
	"DE",
	"DEL",
	"EN",
	"EL",
	"LA",
	"LOS",
	"LAS",
	"MENOS",
]);

/**
 * Un porcentaje SOLO, sin nada más pegado que vocabulario de descuento.
 *
 * Es el piso que va abajo de `PAYMENT_HINTS`, y la respuesta a "una lista de
 * nombres envejece". Envejece, sí — pero la lista no se puede reemplazar por
 * esta regla, porque hacen dos cosas distintas: la lista es lo único que
 * permite NOMBRAR la condición ("esto sale con tarjeta"), y esta regla es lo
 * único que evita la mentira cuando aparece un banco que nadie agregó todavía.
 * Las dos juntas: la lista clasifica lo que conocemos, la regla degrada el
 * resto a "hay una condición que no supimos leer" en vez de a "el producto
 * está 30% más barato".
 *
 * Concretamente: "35%" y "50%Dto" pasan, "Cuenta DNI 20%" y "Galicia 30%
 * Jueves" no — y esas dos, aunque mañana se caigan de la lista de arriba,
 * nunca se redactan como "Descuento sobre el precio".
 *
 * Es también la razón por la que "Comunidad 20%" estaría cubierto aun si se
 * hubiera decidido NO meter "COMUNIDAD" entre las pistas de medio de pago.
 */
function hasOnlyDiscountWords(upper: string): boolean {
	// Sin dígitos ni "%": lo que queda son las palabras. Los tokens de una sola
	// letra se ignoran porque son basura de puntuación ("-mfl-1-7-"), no
	// nombres propios.
	const words = upper
		.replace(/[\d%]+/g, " ")
		.split(/[^A-ZÑ]+/)
		.filter((w) => w.length > 1);
	return words.every((w) => DISCOUNT_WORDS.has(w));
}

/** Todos los porcentajes que nombra la etiqueta, deduplicados y en rango. */
function percentagesIn(upper: string): number[] {
	const found = [...upper.matchAll(/(\d{1,3})\s*%/g)].map((m) => Number(m[1]));
	return [...new Set(found.filter((n) => n > 0 && n <= 100))];
}

/**
 * Todos los NxM de la etiqueta, quedándose sólo con los que son promo de
 * verdad (N > M). El filtro importa: "2X1" es promo, pero un "1X1" o un
 * "PACK 6X6" del nombre del producto no lo son.
 */
function nxmIn(upper: string): { taken: number; paid: number }[] {
	return [...upper.matchAll(/(?:^|[^\dA-Z])(\d+)\s*X\s*(\d+)(?![\dA-Z])/g)]
		.map((m) => ({ taken: Number(m[1]), paid: Number(m[2]) }))
		.filter((p) => p.taken > p.paid && p.paid >= 1);
}

/**
 * Clasifica UNA etiqueta.
 *
 * El orden de los intentos: **mecánica de cantidad -> medio de pago ->
 * porcentaje**. Adentro de la mecánica se copia el orden de
 * `parseRequiredQuantity` en el scraper (llevando -> unidad -> NxM) para que
 * las dos puntas lean el mismo texto de la misma manera; lo único que se agrega
 * es la forma de Dia ("2do al 70%"), que no escribe la palabra "unidad".
 *
 * POR QUÉ LA MECÁNICA VA PRIMERO. Durante un tiempo el medio de pago corría
 * antes que todo, con el argumento de que casi todas las etiquetas bancarias
 * traen un porcentaje adentro y "Tarjeta Carrefour 15%" no puede leerse como
 * 15% de góndola. Ese argumento sigue siendo válido **para los porcentajes**,
 * que son ambiguos por naturaleza: un "30%" solo no dice si es de góndola o de
 * tarjeta, y ahí el nombre propio es la única evidencia que hay.
 *
 * Pero no vale para las mecánicas, y ahí hacía daño. `3X2`, `2X1`, `2da Unid`,
 * `Llevando N` son patrones estructurales que ninguna promo bancaria usa: un
 * banco no te dice "3X2". Un nombre propio de tres letras, en cambio, se cruza
 * todo el tiempo con nombres de producto — y este es un supermercado, así que
 * "Naranja" es una fruta antes que una tarjeta y "Ciudad del Lago" es una marca
 * real del feed de COTO. Con el orden viejo, `"Pan Dulce Naranja Confitada
 * 2x1"` y `"Alfajor Ciudad del Lago 2da Unid 70%"` perdían la mecánica entera.
 * Los `\b` no arreglan ninguno de los dos: en los dos casos la palabra aparece
 * entera y legítima. La lista de nombres tiene un techo ahí.
 *
 * La evidencia de que el cambio no cuesta nada está en los checks: las 13
 * etiquetas bancarias reales que hay de fixture no traen NINGÚN patrón de
 * cantidad, así que ninguna cambia de bucket. Lo que hoy se resolvía por un
 * nombre suelto pasa a resolverse por estructura, que es la señal más fuerte.
 *
 * El caso mixto —una mecánica que ADEMÁS pide tarjeta— no se pierde: gana la
 * mecánica, que es lo que el usuario preguntó, y la condición de pago queda en
 * `paymentHint` y se dice en el `detail`.
 */
export function readPromoLabel(label: string): PromoLabelReading {
	const upper = normalize(label);
	const pcts = percentagesIn(upper);
	const top = pcts.length > 0 ? Math.max(...pcts) : null;
	// La etiqueta hedgea sola ("Hasta 30% DTO!!") o nombra varios porcentajes.
	const hedged = /\bHASTA\b/.test(upper) || pcts.length > 1;

	// Se calcula acá arriba aunque se consulte abajo: una etiqueta puede tener
	// mecánica Y condición de medio de pago a la vez, y en ese caso gana la
	// mecánica pero la condición no se tira a la basura.
	const paymentHint = PAYMENT_HINTS.test(upper);

	const base = {
		label,
		percentage: top,
		capped: hedged,
		paidUnits: null as number | null,
		paymentHint,
	};

	// "Llevando 2 (Hasta 30% DTO!!)", "Llevando 6 (Hasta 30% DTO!!)".
	// Deliberadamente NO se mapea a `second_unit` aunque N sea 2: un 30% sobre
	// el total llevando dos no es lo mismo que un 30% en la segunda unidad, y
	// redactarlo como lo segundo le regalaría al usuario la mitad del descuento
	// que no tiene.
	const llevando = upper.match(/LLEVANDO\s+(\d+)/);
	if (llevando) {
		const qty = Number(llevando[1]);
		if (qty > 1) {
			return { ...base, kind: "quantity", condition: "bulk", requiredQuantity: qty, mechanic: null };
		}
	}

	// "2da Unid 70% DTO!!" (COTO) y "2do al 70%" (Dia): la unidad con descuento
	// es la enésima, o sea que hay que llevar n.
	const nth =
		upper.match(/(\d+)\s*(?:DA|DO|ER|RA|TA|VA|°|º)?\s*UNID/) ??
		upper.match(/(\d+)\s*(?:DA|DO|ER|RA|TA|VA|°|º)\s*AL\b/);
	if (nth) {
		const qty = Number(nth[1]);
		if (qty > 1) {
			return {
				...base,
				kind: "quantity",
				condition: "nth_unit",
				requiredQuantity: qty,
				// Sólo la segunda unidad entra en el vocabulario de campañas.
				mechanic: qty === 2 ? "second_unit" : null,
			};
		}
	}

	// "3X2", "2X1", "4X3 / 4X2". Con varios en la misma etiqueta se muestra el
	// que más conviene y se marca como techo, igual que hace `describePromo`
	// cuando un aviso trae varios porcentajes.
	const deals = nxmIn(upper);
	if (deals.length > 0) {
		const best = deals.reduce((a, b) =>
			(b.taken - b.paid) / b.taken > (a.taken - a.paid) / a.taken ? b : a,
		);
		const mechanic: PromoMechanic | null =
			best.taken === 2 && best.paid === 1
				? "2x1"
				: best.taken === 3 && best.paid === 2
					? "3x2"
					: null;
		return {
			...base,
			kind: "quantity",
			condition: "nxm",
			requiredQuantity: best.taken,
			paidUnits: best.paid,
			capped: hedged || deals.length > 1,
			mechanic,
		};
	}

	// Recién ahora el medio de pago. Ver el comentario de orden en la cabecera
	// de la función: acá ya se descartó que haya una mecánica estructural, así
	// que un nombre propio bancario no le puede pisar nada a nadie.
	if (paymentHint) {
		return { ...base, kind: "payment", condition: null, requiredQuantity: 1, mechanic: null };
	}

	// Un porcentaje pelado y ninguna condición: "35%", "25%" (Dia), "50%Dto"
	// (COTO). Es el único caso en que se puede decir que la unidad sale más
	// barata, así que se exige que la etiqueta no traiga nada más pegado: un
	// "Cuenta DNI 20%" que se escape de PAYMENT_HINTS cae acá abajo, no acá.
	if (top != null && hasOnlyDiscountWords(upper)) {
		return {
			...base,
			kind: "percentage",
			condition: null,
			requiredQuantity: 1,
			mechanic: "percentage_off",
		};
	}

	// Queda "unknown", que con porcentaje `describePromo` ya redacta como
	// "Consultá cómo se aplica" y marca condicional: hay un número, pero la
	// condición que lo habilita no la supimos leer. Nunca "de descuento".

	return { ...base, kind: "unknown", condition: null, requiredQuantity: 1, mechanic: null };
}

/** Ordinal femenino sin irregulares: "2ª", "3ª", "10ª". Escribir "3era"/"3ra"
 * a mano sale mal apenas aparece un 11. */
function ordinal(n: number): string {
	return `${n}ª`;
}

/**
 * La redacción de una etiqueta ya clasificada.
 *
 * Con mecánica conocida delega en `describePromo`, que es la única autoridad de
 * redacción del repo. Sin ella redacta acá los tres casos que ese vocabulario
 * no tiene — y siempre con `conditional: true`, porque los tres comparten
 * exactamente lo que el usuario se quejó de no ver: el precio de UNA unidad no
 * baja.
 */
export function describePromoLabel(reading: PromoLabelReading): PromoWording {
	const base = describeMechanic(reading);
	// Una mecánica que además pide tarjeta: la mecánica se muestra igual —es lo
	// que el usuario preguntó— pero no puede quedar como si la consiguiera
	// cualquiera. Se dice en el `detail`, que la pantalla ya renderiza debajo
	// del chip, sin inventarle un lugar propio a un caso del que todavía no
	// tenemos una etiqueta real medida.
	if (reading.paymentHint && reading.kind !== "payment") {
		return {
			...base,
			detail: `${base.detail} Sujeto al medio de pago o programa que indica la etiqueta.`,
			conditional: true,
		};
	}
	return base;
}

function describeMechanic(reading: PromoLabelReading): PromoWording {
	if (reading.mechanic) {
		return describePromo(
			reading.percentage != null ? [reading.percentage] : [],
			reading.mechanic,
			reading.capped,
		);
	}

	const pct = reading.percentage != null ? `${reading.percentage}%` : null;
	const prefix = reading.capped ? "Hasta " : "";

	switch (reading.condition) {
		case "nxm": {
			const taken = reading.requiredQuantity;
			const paid = reading.paidUnits ?? taken;
			const amount = `${taken}x${paid}`;
			return {
				amount,
				capped: reading.capped,
				applies: `Llevás ${taken}, pagás ${paid}`,
				detail: `Llevando ${taken} unidades pagás ${paid}. Una sola unidad sale el precio de siempre.`,
				headline: `${prefix}${amount}`,
				icon: "gift-outline",
				conditional: true,
				generic: false,
			};
		}
		case "nth_unit":
			return {
				amount: pct,
				capped: reading.capped,
				applies: `En la ${ordinal(reading.requiredQuantity)} unidad`,
				detail: `El porcentaje se descuenta de la unidad ${reading.requiredQuantity}, no de las anteriores.`,
				headline: pct
					? `${prefix}${pct} en la ${ordinal(reading.requiredQuantity)} unidad`
					: `Descuento en la ${ordinal(reading.requiredQuantity)} unidad`,
				icon: "layers-outline",
				conditional: true,
				generic: false,
			};
		case "bulk":
			return {
				amount: pct,
				capped: reading.capped,
				applies: `Llevando ${reading.requiredQuantity}`,
				detail: `El descuento aparece recién llevando ${reading.requiredQuantity} unidades: con una sola, el precio no baja.`,
				headline: pct
					? `${prefix}${pct} llevando ${reading.requiredQuantity}`
					: `Descuento llevando ${reading.requiredQuantity}`,
				icon: "layers-outline",
				conditional: true,
				generic: false,
			};
	}

	// Sin condición y sin mecánica: que lo resuelva `describePromo`, que ya sabe
	// no llamarle "descuento" a algo que no pudo leer.
	return describePromo(
		reading.percentage != null ? [reading.percentage] : [],
		null,
		reading.capped,
	);
}

/**
 * Cuál de todas las etiquetas es LA promoción del producto.
 *
 * El criterio, de más a menos informativo:
 *   1. una condición de cantidad (es lo que el usuario pidió ver);
 *   2. un porcentaje directo;
 *   3. cualquier otra cosa.
 * Entre dos condiciones de cantidad gana la que pide llevar menos unidades:
 * un "2da Unid 70%" y un "Llevando 6 (Hasta 30%)" sobre el mismo producto son
 * dos promos reales, y la accionable hoy es la que no obliga a llevar media
 * góndola. A igualdad de unidades, el porcentaje más alto.
 */
export function pickProductPromo(readings: PromoLabelReading[]): PromoLabelReading | null {
	const usable = readings.filter((r) => r.kind !== "payment");
	if (usable.length === 0) return null;
	const rank = (r: PromoLabelReading) =>
		r.kind === "quantity" ? 0 : r.kind === "percentage" ? 1 : r.percentage != null ? 2 : 3;
	return usable.reduce((best, r) => {
		const byKind = rank(r) - rank(best);
		if (byKind !== 0) return byKind < 0 ? r : best;
		if (r.requiredQuantity !== best.requiredQuantity) {
			return r.requiredQuantity < best.requiredQuantity ? r : best;
		}
		return (r.percentage ?? 0) > (best.percentage ?? 0) ? r : best;
	});
}

/** Clasifica una lista de etiquetas, ignorando vacíos y repetidas. */
export function readPromoLabels(
	labels: (string | null | undefined)[] | null | undefined,
): PromoLabelReading[] {
	const seen = new Set<string>();
	const out: PromoLabelReading[] = [];
	for (const raw of labels ?? []) {
		const label = raw?.trim();
		if (!label) continue;
		const key = normalize(label);
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(readPromoLabel(label));
	}
	return out;
}
