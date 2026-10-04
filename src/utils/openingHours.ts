/**
 * Horarios de atención de una sucursal y si está abierta en un instante dado.
 *
 * El backend los manda en `horarios` (sucursales de SEPA y `/stores/nearby`):
 *
 *   "horarios": {
 *     "lunes":  [{ "desde": "08:00", "hasta": "22:00" }],
 *     "martes": [{ "desde": "08:30", "hasta": "13:00" }, { "desde": "16:00", "hasta": "20:30" }],
 *     "miercoles": [],        ← cerrado ese día
 *     "jueves": null,         ← no informado
 *     "sabado": [{ "desde": "18:00", "hasta": "02:00" }]   ← cruza la medianoche
 *   }
 *
 * `horarios` ausente o null es "sin datos": el backend actual todavía no lo manda
 * y la pantalla no tiene que mostrar nada. La regla de fondo es no decir nunca
 * "Abierto" sin certeza: alguien puede cruzar la ciudad por ese cartel. Ante un
 * día no informado o un dato raro, el estado es "desconocido" y no se muestra.
 */

/** En el orden de `getUTCDay()`: 0 es domingo. Sin tilde, como las claves del backend. */
export const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"] as const;
export type Dia = (typeof DIAS)[number];

const NOMBRE_DIA: Record<Dia, string> = {
	domingo: "domingo",
	lunes: "lunes",
	martes: "martes",
	miercoles: "miércoles",
	jueves: "jueves",
	viernes: "viernes",
	sabado: "sábado",
};

export type RangoHorario = { desde: string; hasta: string };
/** Un día: `[]` cerrado, `null` (o sin la clave) no informado. */
export type Horarios = Partial<Record<Dia, RangoHorario[] | null>>;

/**
 * Hora argentina con offset fijo: Argentina no tiene horario de verano desde
 * 2009. No se usa `Intl` con `timeZone` (en Hermes no es confiable) ni la zona
 * del teléfono: alguien con el teléfono en hora de Madrid vería abierta a las
 * 3 de la mañana una sucursal de Palermo.
 */
export const ARGENTINA_UTC_OFFSET_MIN = -3 * 60;

/** A partir de cuántos minutos del cierre se avisa "Cierra pronto". */
export const CIERRA_PRONTO_MIN = 60;

const DAY = 24 * 60;

export type OpeningStatus =
	| { kind: "unknown" }
	/** Abierto todo el día de hoy (o toda la semana), sin cierre cercano. */
	| { kind: "open24" }
	| {
			kind: "open";
			/** "22:00"; null cuando el cierre cae en un día no informado. */
			closesAt: string | null;
			/** El cierre es dentro de más de 24 h: la hora sola no alcanza. */
			closesDay: Dia | null;
			closingSoon: boolean;
	  }
	| {
			kind: "closed";
			/** null si no se puede saber (hay un día sin informar antes). */
			opens: { at: string; when: "hoy" | "mañana" | Dia } | null;
	  };

/** Día y minuto del día en Argentina, sin importar la zona del dispositivo. */
export function argentineClock(now: Date | number): { day: number; minute: number } {
	const ms = typeof now === "number" ? now : now.getTime();
	const local = new Date(ms + ARGENTINA_UTC_OFFSET_MIN * 60_000);
	return { day: local.getUTCDay(), minute: local.getUTCHours() * 60 + local.getUTCMinutes() };
}

/** "08:30" → 510. "24:00" sólo vale como `hasta`. Cualquier otra cosa → null. */
function parseTime(value: unknown, isEnd: boolean): number | null {
	if (typeof value !== "string") return null;
	const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
	if (!m) return null;
	const h = Number(m[1]);
	const min = Number(m[2]);
	if (min > 59) return null;
	if (h === 24) return isEnd && min === 0 ? DAY : null;
	return h <= 23 ? h * 60 + min : null;
}

/** Rangos de un día en minutos desde su 00:00; el fin puede pasar de 1440 si cruza la medianoche. */
type DayHours = { known: false } | { known: true; spans: [number, number][] };

function readDay(value: unknown): DayHours | "invalid" {
	if (value === null || value === undefined) return { known: false };
	if (!Array.isArray(value)) return "invalid";
	const spans: [number, number][] = [];
	for (const r of value) {
		if (!r || typeof r !== "object") return "invalid";
		const desde = parseTime((r as RangoHorario).desde, false);
		const hasta = parseTime((r as RangoHorario).hasta, true);
		if (desde == null || hasta == null) return "invalid";
		// Mismo horario de apertura y cierre: ¿24 h o nada? El contrato escribe las
		// 24 h como "00:00"–"24:00", así que esto es un dato raro, no una respuesta.
		if (hasta === desde) return "invalid";
		spans.push([desde, hasta > desde ? hasta : hasta + DAY]);
	}
	return { known: true, spans };
}

/** Los siete días leídos, o null si no hay nada confiable para decir. */
function readWeek(horarios: unknown): DayHours[] | null {
	if (!horarios || typeof horarios !== "object" || Array.isArray(horarios)) return null;
	const week: DayHours[] = [];
	for (const dia of DIAS) {
		const day = readDay((horarios as Record<string, unknown>)[dia]);
		// Un rango ilegible pone en duda todo el resto: mejor callar que adivinar.
		if (day === "invalid") return null;
		week.push(day);
	}
	if (week.every((d) => !d.known)) return null;
	// Una semana entera cerrada no es un súper que figura en el mapa: es un dato vacío
	// mal cargado.
	if (week.every((d) => d.known && d.spans.length === 0)) return null;
	return week;
}

export function formatClock(minuteOfDay: number): string {
	const m = ((minuteOfDay % DAY) + DAY) % DAY;
	return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Si la sucursal está abierta en `now`, con la hora de cierre o la próxima
 * apertura. `now` es un instante (UTC); la hora argentina se calcula acá.
 */
export function openingStatus(horarios: Horarios | null | undefined, now: Date | number): OpeningStatus {
	const week = readWeek(horarios);
	if (!week) return { kind: "unknown" };
	const { day, minute: t } = argentineClock(now);

	// Línea de tiempo en minutos desde el 00:00 de hoy: ayer (-1), por un rango que
	// cruza la medianoche, y la semana que viene hasta el mismo día (7).
	const unknownOffsets = new Set<number>();
	const intervals: { start: number; end: number }[] = [];
	for (let k = -1; k <= 7; k++) {
		const d = week[(day + k + 7) % 7];
		if (!d.known) {
			unknownOffsets.add(k);
			continue;
		}
		for (const [s, e] of d.spans) intervals.push({ start: k * DAY + s, end: k * DAY + e });
	}

	// Sin saber qué pasa hoy no se puede decir nada.
	if (unknownOffsets.has(0)) return { kind: "unknown" };

	const containing = intervals.filter((i) => i.start <= t && t < i.end);
	if (containing.length === 0) {
		// Cerrado según hoy, pero si ayer no se informó pudo haber un turno de noche
		// que sigue abierto (sábado 18:00–02:00 → domingo 01:00).
		if (unknownOffsets.has(-1)) return { kind: "unknown" };
		return { kind: "closed", opens: nextOpening(intervals, unknownOffsets, t, day) };
	}

	// Rangos que se tocan o se pisan son un solo turno: viernes 00:00–24:00 y sábado
	// 00:00–02:00 cierran a las 2, no a medianoche.
	let start = Math.min(...containing.map((i) => i.start));
	let end = Math.max(...containing.map((i) => i.end));
	for (let changed = true; changed; ) {
		changed = false;
		for (const i of intervals) {
			if (i.start <= end && i.end > end) {
				end = i.end;
				changed = true;
			}
			if (i.end >= start && i.start < start) {
				start = i.start;
				changed = true;
			}
		}
	}

	// Abierto hasta más allá de lo que se mira: abierto siempre.
	if (end >= 7 * DAY) return { kind: "open24" };

	// Si el turno llega a un día que no se informó, no se sabe si sigue: abierto es
	// seguro, la hora de cierre no.
	const reachesUnknown = [...unknownOffsets].some((k) => k >= 1 && k * DAY <= end);
	const left = end - t;
	const coversToday = start <= 0 && end >= DAY;
	if (coversToday && left > CIERRA_PRONTO_MIN) return { kind: "open24" };
	if (reachesUnknown) return { kind: "open", closesAt: null, closesDay: null, closingSoon: false };
	return {
		kind: "open",
		closesAt: formatClock(end),
		closesDay: left > DAY ? DIAS[(day + Math.floor(end / DAY)) % 7] : null,
		closingSoon: left <= CIERRA_PRONTO_MIN,
	};
}

function nextOpening(
	intervals: { start: number; end: number }[],
	unknownOffsets: Set<number>,
	t: number,
	today: number,
): { at: string; when: "hoy" | "mañana" | Dia } | null {
	const next = intervals.filter((i) => i.start > t).sort((a, b) => a.start - b.start)[0];
	if (!next) return null;
	const k = Math.floor(next.start / DAY);
	// Un día sin informar antes de esa apertura podría tener una más temprana.
	for (let j = 1; j <= k; j++) if (unknownOffsets.has(j)) return null;
	return { at: formatClock(next.start), when: k === 0 ? "hoy" : k === 1 ? "mañana" : DIAS[(today + k) % 7] };
}

/** Texto corto para una fila o un callout. null cuando no hay nada seguro que decir. */
export function openingLabel(status: OpeningStatus): string | null {
	switch (status.kind) {
		case "unknown":
			return null;
		case "open24":
			return "Abierto 24 h";
		case "open":
			if (status.closesAt == null) return "Abierto";
			if (status.closingSoon) return `Cierra pronto · ${status.closesAt}`;
			return status.closesDay
				? `Abierto · cierra el ${NOMBRE_DIA[status.closesDay]} ${status.closesAt}`
				: `Abierto · cierra ${status.closesAt}`;
		case "closed": {
			const o = status.opens;
			if (!o) return "Cerrado";
			if (o.when === "hoy") return `Cerrado · abre ${o.at}`;
			if (o.when === "mañana") return `Cerrado · abre mañana ${o.at}`;
			return `Cerrado · abre el ${NOMBRE_DIA[o.when]} ${o.at}`;
		}
	}
}

/** Lo mismo para un lector de pantalla: sin el "·" ni la abreviatura "24 h". */
export function openingAccessibilityLabel(status: OpeningStatus): string | null {
	const label = openingLabel(status);
	return label ? label.replace(" · ", ", ").replace("24 h", "las 24 horas") : null;
}

export type OpeningTone = "open" | "soon" | "closed";

/** Para el color del texto; el texto ya dice todo, el color sólo acompaña. */
export function openingTone(status: OpeningStatus): OpeningTone | null {
	if (status.kind === "open24") return "open";
	if (status.kind === "open") return status.closingSoon ? "soon" : "open";
	if (status.kind === "closed") return "closed";
	return null;
}

export function isOpenNow(status: OpeningStatus): boolean {
	return status.kind === "open" || status.kind === "open24";
}

/** Una línea por día para el detalle de la sucursal, de lunes a domingo. */
export type WeekLine = { dia: Dia; nombre: string; texto: string; hoy: boolean };

export function describeWeek(horarios: Horarios | null | undefined, now: Date | number): WeekLine[] | null {
	const week = readWeek(horarios);
	if (!week) return null;
	const { day: today } = argentineClock(now);
	const order = [1, 2, 3, 4, 5, 6, 0];
	return order.map((i) => {
		const d = week[i];
		const nombre = NOMBRE_DIA[DIAS[i]];
		let texto: string;
		if (!d.known) texto = "Sin datos";
		else if (d.spans.length === 0) texto = "Cerrado";
		else if (d.spans.length === 1 && d.spans[0][0] === 0 && d.spans[0][1] === DAY) texto = "24 h";
		else
			texto = [...d.spans]
				.sort((a, b) => a[0] - b[0])
				.map(([s, e]) => `${formatClock(s)}–${e === DAY ? "24:00" : formatClock(e)}`)
				.join(" y ");
		return { dia: DIAS[i], nombre: nombre[0].toUpperCase() + nombre.slice(1), texto, hoy: i === today };
	});
}
