/**
 * Si una sucursal está abierta, con su horario del backend (`src/utils/openingHours.ts`).
 *
 *   npx tsx scripts/verifyOpeningHours.ts
 *
 * Lo que tiene que cumplirse:
 *   - la hora es la argentina (UTC−3 fijo), con el teléfono en cualquier zona:
 *     todo el script corre cuatro veces, cambiando la zona del proceso;
 *   - un turno de noche del día anterior cuenta (sábado 18–02 → domingo 01:00 abierto);
 *   - los bordes: a la hora de apertura está abierta, a la de cierre ya no;
 *   - un día no informado, o un dato raro, es "no se sabe" y no se muestra: nunca
 *     "Abierto" sin certeza;
 *   - sin `horarios` (el backend de hoy) no se dice nada.
 */
import assert from "node:assert/strict";

import {
	argentineClock,
	describeWeek,
	isOpenNow,
	openingAccessibilityLabel,
	openingLabel,
	openingStatus,
	type Horarios,
} from "../src/utils/openingHours";
import { CLOSED_BADGE, markerHaloColorFor } from "../src/components/storeMarkerStatus";
import { contrastRatio, MIN_SHAPE_CONTRAST, MIN_TEXT_CONTRAST } from "../src/theme/chainMarkers";

let failures = 0;
/** En las zonas que se repiten sólo se imprimen las fallas. */
let quiet = false;
function check(name: string, fn: () => void): void {
	try {
		fn();
		if (!quiet) console.log(`  ok   ${name}`);
	} catch (err) {
		failures++;
		console.log(`  FAIL ${name}`);
		console.log(`       ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
	}
}

/** Un instante dado en hora argentina. La semana del 28/9/2026 empieza un lunes. */
const DIA_DEL_MES = { lunes: 28, martes: 29, miercoles: 30, jueves: 31, viernes: 32, sabado: 33, domingo: 34 } as const;
function ar(dia: keyof typeof DIA_DEL_MES, hhmm: string): number {
	const [h, m] = hhmm.split(":").map(Number);
	// Date.UTC normaliza el día 31 de septiembre a 1 de octubre, etc.
	return Date.UTC(2026, 8, DIA_DEL_MES[dia], h + 3, m);
}

/** El ejemplo del contrato con el backend, tal cual. */
const CONTRATO: Horarios = {
	lunes: [{ desde: "08:00", hasta: "22:00" }],
	martes: [
		{ desde: "08:30", hasta: "13:00" },
		{ desde: "16:00", hasta: "20:30" },
	],
	miercoles: [],
	jueves: null,
	viernes: [{ desde: "00:00", hasta: "24:00" }],
	sabado: [{ desde: "18:00", hasta: "02:00" }],
	domingo: [],
};

const label = (h: Horarios | null | undefined, t: number | Date) => openingLabel(openingStatus(h, t));

const TODOS = (rango: { desde: string; hasta: string }[] | null): Horarios => ({
	lunes: rango,
	martes: rango,
	miercoles: rango,
	jueves: rango,
	viernes: rango,
	sabado: rango,
	domingo: rango,
});

const log = (text: string) => {
	if (!quiet) console.log(text);
};

function suite(): void {
	check("la semana de prueba empieza un lunes (hora argentina)", () => {
		assert.equal(argentineClock(ar("lunes", "10:00")).day, 1);
		assert.equal(argentineClock(ar("domingo", "23:59")).day, 0);
		assert.equal(argentineClock(ar("lunes", "10:00")).minute, 600);
	});

	log("   rango simple");
	check("lunes 10:00 abierto, cierra 22:00", () => {
		assert.equal(label(CONTRATO, ar("lunes", "10:00")), "Abierto · cierra 22:00");
	});
	check("lunes 21:30 cierra pronto", () => {
		assert.equal(label(CONTRATO, ar("lunes", "21:30")), "Cierra pronto · 22:00");
	});
	check("a una hora justa del cierre ya es 'pronto'; un minuto antes, no", () => {
		assert.equal(label(CONTRATO, ar("lunes", "21:00")), "Cierra pronto · 22:00");
		assert.equal(label(CONTRATO, ar("lunes", "20:59")), "Abierto · cierra 22:00");
	});
	check("borde de apertura: lunes 08:00 en punto está abierto; 07:59, cerrado", () => {
		assert.equal(openingStatus(CONTRATO, ar("lunes", "08:00")).kind, "open");
		assert.equal(label(CONTRATO, ar("lunes", "07:59")), "Cerrado · abre 8:00");
	});
	check("borde de cierre: lunes 22:00 en punto ya está cerrado, abre mañana", () => {
		assert.equal(label(CONTRATO, ar("lunes", "22:00")), "Cerrado · abre mañana 8:30");
	});

	log("   turno partido");
	check("martes 10:00 abierto hasta las 13", () => {
		assert.equal(label(CONTRATO, ar("martes", "10:00")), "Abierto · cierra 13:00");
	});
	check("martes 12:30 cierra pronto (13:00)", () => {
		assert.equal(label(CONTRATO, ar("martes", "12:30")), "Cierra pronto · 13:00");
	});
	check("martes 14:00, entre turnos: cerrado, abre 16:00 (hoy)", () => {
		assert.equal(label(CONTRATO, ar("martes", "14:00")), "Cerrado · abre 16:00");
	});
	check("martes 16:00 abre el segundo turno", () => {
		assert.equal(label(CONTRATO, ar("martes", "16:00")), "Abierto · cierra 20:30");
	});

	log("   cerrado y no informado");
	check("miércoles ([] = cerrado) a las 12: cerrado; el jueves no se informó, así que no se dice cuándo abre", () => {
		assert.equal(label(CONTRATO, ar("miercoles", "12:00")), "Cerrado");
	});
	check("jueves (null = no informado): no se sabe, no se muestra nada", () => {
		assert.equal(openingStatus(CONTRATO, ar("jueves", "12:00")).kind, "unknown");
		assert.equal(label(CONTRATO, ar("jueves", "12:00")), null);
	});
	check("día sin la clave es igual que null", () => {
		assert.equal(openingStatus({ lunes: [{ desde: "08:00", hasta: "22:00" }] }, ar("martes", "10:00")).kind, "unknown");
	});
	check("sin horarios (backend actual): desconocido y sin texto", () => {
		for (const h of [undefined, null, {} as Horarios]) {
			assert.equal(openingStatus(h, ar("lunes", "10:00")).kind, "unknown");
			assert.equal(label(h, ar("lunes", "10:00")), null);
		}
	});

	log("   24 h");
	check("viernes 00:00–24:00 a las 3: abierto 24 h (aunque el jueves no esté informado)", () => {
		assert.equal(label(CONTRATO, ar("viernes", "03:00")), "Abierto 24 h");
	});
	check("viernes 23:30: cierra pronto, a medianoche", () => {
		assert.equal(label(CONTRATO, ar("viernes", "23:30")), "Cierra pronto · 0:00");
	});
	check("toda la semana 00:00–24:00: abierto 24 h a cualquier hora", () => {
		const h = TODOS([{ desde: "00:00", hasta: "24:00" }]);
		for (const t of [ar("lunes", "00:00"), ar("miercoles", "23:59"), ar("domingo", "23:30")]) {
			assert.equal(label(h, t), "Abierto 24 h");
		}
	});
	check("el texto accesible no abrevia", () => {
		assert.equal(openingAccessibilityLabel(openingStatus(CONTRATO, ar("viernes", "03:00"))), "Abierto las 24 horas");
		assert.equal(openingAccessibilityLabel(openingStatus(CONTRATO, ar("lunes", "10:00"))), "Abierto, cierra 22:00");
	});

	log("   cruce de medianoche");
	check("sábado 20:00 (18:00–02:00): abierto, cierra 2:00", () => {
		assert.equal(label(CONTRATO, ar("sabado", "20:00")), "Abierto · cierra 2:00");
	});
	check("domingo 01:00 cuenta el turno del sábado a la noche: abierto, cierra pronto", () => {
		assert.equal(label(CONTRATO, ar("domingo", "01:00")), "Cierra pronto · 2:00");
	});
	check("domingo 02:00 en punto ya cerró; el domingo es [] y abre el lunes (mañana)", () => {
		assert.equal(label(CONTRATO, ar("domingo", "02:00")), "Cerrado · abre mañana 8:00");
	});
	check("domingo → lunes: domingo 23:00 cerrado, abre mañana 8:00", () => {
		assert.equal(label(CONTRATO, ar("domingo", "23:00")), "Cerrado · abre mañana 8:00");
	});
	check("turno de noche del domingo que termina el lunes a la madrugada (vuelta de semana)", () => {
		const h: Horarios = { ...TODOS([]), domingo: [{ desde: "20:00", hasta: "03:00" }] };
		assert.equal(label(h, ar("lunes", "02:30")), "Cierra pronto · 3:00");
		assert.equal(label(h, ar("lunes", "03:00")), "Cerrado · abre el domingo 20:00");
	});
	check("24:00 que empalma con 00:00 del día siguiente es un solo turno", () => {
		const h: Horarios = { ...TODOS([]), lunes: [{ desde: "18:00", hasta: "24:00" }], martes: [{ desde: "00:00", hasta: "02:00" }] };
		assert.equal(label(h, ar("lunes", "20:00")), "Abierto · cierra 2:00");
	});
	check("sin saber el día anterior, a la madrugada no se sabe si sigue el turno de noche", () => {
		const h: Horarios = { ...CONTRATO, domingo: null };
		assert.equal(openingStatus(h, ar("lunes", "05:00")).kind, "unknown");
		// Dentro de un turno de hoy sí se sabe.
		assert.equal(label(h, ar("lunes", "10:00")), "Abierto · cierra 22:00");
	});
	check("si el turno termina a medianoche y el día siguiente no se informó: 'Abierto', sin hora", () => {
		const h: Horarios = { ...TODOS([]), lunes: [{ desde: "18:00", hasta: "24:00" }], martes: null };
		assert.equal(label(h, ar("lunes", "20:00")), "Abierto");
	});

	log("   zona horaria");
	check("un instante UTC que en Argentina todavía es el día anterior", () => {
		// Martes 00:30 UTC = lunes 21:30 en Argentina: el lunes cierra a las 22.
		const t = Date.UTC(2026, 8, 29, 0, 30);
		assert.equal(new Date(t).getUTCDay(), 2);
		assert.equal(label(CONTRATO, t), "Cierra pronto · 22:00");
	});
	check("martes 02:00 UTC = lunes 23:00 en Argentina: cerrado, abre mañana (martes) 8:30", () => {
		assert.equal(label(CONTRATO, Date.UTC(2026, 8, 29, 2, 0)), "Cerrado · abre mañana 8:30");
	});
	check("acepta Date además de ms", () => {
		assert.equal(label(CONTRATO, new Date(ar("lunes", "10:00"))), "Abierto · cierra 22:00");
	});

	log("   próxima apertura en otro día");
	check("abre sólo los lunes: el miércoles dice 'abre el lunes'", () => {
		const h: Horarios = { ...TODOS([]), lunes: [{ desde: "08:00", hasta: "22:00" }] };
		assert.equal(label(h, ar("miercoles", "10:00")), "Cerrado · abre el lunes 8:00");
	});
	check("con acentos donde van", () => {
		const h: Horarios = { ...TODOS([]), sabado: [{ desde: "09:00", hasta: "13:00" }] };
		assert.equal(label(h, ar("miercoles", "10:00")), "Cerrado · abre el sábado 9:00");
	});

	log("   datos raros: no se adivina");
	check("hora imposible, formato raro, apertura = cierre, o no es una lista: desconocido", () => {
		const raros: unknown[] = [
			{ ...CONTRATO, lunes: [{ desde: "08:00", hasta: "25:00" }] },
			{ ...CONTRATO, lunes: [{ desde: "8h", hasta: "22h" }] },
			{ ...CONTRATO, lunes: [{ desde: "08:00", hasta: "08:00" }] },
			{ ...CONTRATO, lunes: [{ desde: "24:00", hasta: "22:00" }] },
			{ ...CONTRATO, lunes: [{ desde: "08:60", hasta: "22:00" }] },
			{ ...CONTRATO, lunes: "08:00-22:00" },
			{ ...CONTRATO, lunes: [null] },
			"lunes a viernes",
			[],
		];
		for (const h of raros) {
			assert.equal(openingStatus(h as Horarios, ar("lunes", "10:00")).kind, "unknown", JSON.stringify(h));
		}
	});
	check("una semana entera cerrada es un dato vacío, no un súper cerrado para siempre", () => {
		assert.equal(openingStatus(TODOS([]), ar("lunes", "10:00")).kind, "unknown");
	});
	check("todo null: desconocido", () => {
		assert.equal(openingStatus(TODOS(null), ar("lunes", "10:00")).kind, "unknown");
	});
	check("isOpenNow sólo es verdadero con certeza", () => {
		assert.equal(isOpenNow(openingStatus(CONTRATO, ar("lunes", "10:00"))), true);
		assert.equal(isOpenNow(openingStatus(CONTRATO, ar("jueves", "10:00"))), false);
		assert.equal(isOpenNow(openingStatus(CONTRATO, ar("miercoles", "10:00"))), false);
	});

	log("   semana para el detalle");
	check("una línea por día, de lunes a domingo, con hoy marcado", () => {
		const w = describeWeek(CONTRATO, ar("martes", "10:00"));
		if (!w) throw new Error("sin semana");
		assert.deepEqual(
			w.map((l) => `${l.nombre}: ${l.texto}`),
			[
				"Lunes: 8:00–22:00",
				"Martes: 8:30–13:00 y 16:00–20:30",
				"Miércoles: Cerrado",
				"Jueves: Sin datos",
				"Viernes: 24 h",
				"Sábado: 18:00–2:00",
				"Domingo: Cerrado",
			],
		);
		assert.deepEqual(w.filter((l) => l.hoy).map((l) => l.dia), ["martes"]);
		assert.equal(describeWeek(undefined, ar("martes", "10:00")), null);
	});
}

// La misma batería con el proceso en distintas zonas: el resultado no puede
// depender de la del dispositivo.
const ZONAS = ["America/Argentina/Buenos_Aires", "UTC", "Asia/Tokyo", "America/Los_Angeles"];
ZONAS.forEach((zona, i) => {
	process.env.TZ = zona;
	quiet = i > 0;
	const before = failures;
	console.log(`\nCon el dispositivo en ${zona}${quiet ? " (sólo se imprimen las fallas)" : ""}`);
	suite();
	if (quiet && failures === before) console.log("  ok   la misma batería da lo mismo");
});
quiet = false;

console.log("\nEl pin de una sucursal cerrada no pierde contraste");
check("la marca de 'cerrado' se lee sobre el halo, en claro y oscuro", () => {
	assert.ok(contrastRatio(CLOSED_BADGE.glyph, CLOSED_BADGE.fill) >= MIN_TEXT_CONTRAST);
	for (const dark of [false, true]) {
		assert.ok(contrastRatio(CLOSED_BADGE.fill, markerHaloColorFor(dark)) >= MIN_SHAPE_CONTRAST);
	}
});

if (failures > 0) {
	console.log(`\n${failures} check(s) failed.`);
	process.exit(1);
}
console.log("\nAll checks passed.");
