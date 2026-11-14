/**
 * Reglas de Mis tarjetas y del calendario de promos bancarias (OFT-54..57), en un módulo plano
 * para poder probarlas sin levantar React Native (src/utils/__tests__/bankPromos.test.ts).
 *
 * Lo que decide qué ve el usuario vive acá y no en las pantallas:
 *  - el orden dentro de un día (§4 y D8): primero lo que podés usar, después lo que casi, y las
 *    cuotas y montos debajo de los porcentajes;
 *  - el agrupado por súper, juntando la misma promo publicada en varias cadenas (Jumbo, Disco y
 *    Vea suelen compartirla);
 *  - el texto de cada chip, que nunca depende sólo del color;
 *  - los pasos del alta de una tarjeta, donde las billeteras saltan directo a confirmar.
 */
import { CONDITIONS_TITLE, type ConditionsBlock, type ConditionsLine, type PromoConditions } from "../components/promoConditions";
import type {
	BankPromo,
	BankPromoMatch,
	BankPromoToday,
	BankPromoWeek,
	CatalogIssuer,
	CatalogOption,
	PaymentMethod,
	PaymentMethodInput,
} from "../services/bankPromosApi";
import { initialsFrom } from "../theme/chainMarkers";
import { formatCurrency } from "./format";

// ── Fechas (siempre días de calendario, sin hora) ────────────────────

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIso(iso: string): Date {
	const m = ISO_DAY.exec(iso);
	if (!m) throw new Error(`Fecha inválida: ${iso}`);
	return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function toIso(d: Date): string {
	return d.toISOString().slice(0, 10);
}

/** Hoy en Argentina (UTC-3, sin horario de verano), como lo calcula el backend para `from`. */
export function argentinaToday(now: Date = new Date()): string {
	return toIso(new Date(now.getTime() - 3 * 3_600_000));
}

export function addDays(iso: string, days: number): string {
	const d = parseIso(iso);
	d.setUTCDate(d.getUTCDate() + days);
	return toIso(d);
}

/** 1 = lunes … 7 = domingo, como `weekday` en el contrato. */
export function weekdayOf(iso: string): number {
	return ((parseIso(iso).getUTCDay() + 6) % 7) + 1;
}

export const DAY_SHORT = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"] as const;
export const DAY_LONG = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"] as const;
const MONTHS = [
	"enero",
	"febrero",
	"marzo",
	"abril",
	"mayo",
	"junio",
	"julio",
	"agosto",
	"septiembre",
	"octubre",
	"noviembre",
	"diciembre",
];

export function dayOfMonth(iso: string): number {
	return parseIso(iso).getUTCDate();
}

/** "30/11" */
export function shortDate(iso: string): string {
	const d = parseIso(iso);
	return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "30 de noviembre" */
export function longDate(iso: string): string {
	const d = parseIso(iso);
	return `${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}

/** "Hoy, domingo 1 de noviembre" o "martes 3 de noviembre". */
export function dayTitle(iso: string, isToday: boolean): string {
	const text = `${DAY_LONG[weekdayOf(iso) - 1]} ${longDate(iso)}`;
	return isToday ? `Hoy, ${text}` : capitalize(text);
}

// ── Nombres ──────────────────────────────────────────────────────────

/** Por si el catálogo todavía no llegó: los slugs del SPEC §3. */
const NETWORK_NAMES: Record<string, string> = {
	visa: "Visa",
	mastercard: "Mastercard",
	amex: "American Express",
	cabal: "Cabal",
	naranja: "Naranja",
};

const CARD_TYPE_NAMES: Record<string, string> = {
	credit: "crédito",
	debit: "débito",
	prepaid: "prepaga",
	wallet: "billetera",
};

/** Requisitos de la persona (D6), con el nombre que se lee en un chip. */
export const CONDITION_NAMES: Record<string, string> = {
	jubilado: "jubilados y pensionados",
	empleado_publico: "empleados públicos",
	plan_sueldo: "plan sueldo",
	club_la_nacion: "Club La Nación",
	jumbo_mas: "Jumbo+",
	mi_carrefour: "Mi Carrefour",
};

export function networkName(slug: string, networks: CatalogOption[] = []): string {
	return networks.find((n) => n.slug === slug)?.name ?? NETWORK_NAMES[slug] ?? slug;
}

/** En minúscula, para usarlo dentro de una frase ("Visa crédito"). */
export function cardTypeName(slug: string, cardTypes: CatalogOption[] = []): string {
	const fromCatalog = cardTypes.find((t) => t.slug === slug)?.name;
	return (fromCatalog ?? CARD_TYPE_NAMES[slug] ?? slug).toLowerCase();
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "CORDOBA" o "río negro" → "Córdoba", "Río Negro" (las provincias pueden venir en mayúscula). */
export function provinceName(raw: string): string {
	const known: Record<string, string> = {
		CORDOBA: "Córdoba",
		"RIO NEGRO": "Río Negro",
		NEUQUEN: "Neuquén",
		TUCUMAN: "Tucumán",
		"ENTRE RIOS": "Entre Ríos",
		CABA: "CABA",
	};
	const key = raw
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.trim()
		.toUpperCase();
	if (known[key]) return known[key];
	return raw
		.toLowerCase()
		.split(/\s+/)
		.map((w) => (["de", "del", "la"].includes(w) ? w : capitalize(w)))
		.join(" ");
}

/** "Jumbo", "Jumbo y Disco", "Jumbo, Disco y Vea". */
export function joinNames(names: string[], last = "y"): string {
	if (names.length <= 1) return names[0] ?? "";
	return `${names.slice(0, -1).join(", ")} ${last} ${names[names.length - 1]}`;
}

// ── Una promo, en palabras ───────────────────────────────────────────

/** El % con el que se ordena y se elige "lo mejor del día". Con variantes por paquete, el
 * mínimo: ordenar por el máximo prometería un 35% que la mayoría no tiene. */
export function promoPercent(p: BankPromo): number | null {
	if (p.discount.kind !== "percent") return null;
	return p.discount.percent ?? p.percentRange?.min ?? null;
}

function isRefund(p: BankPromo): boolean {
	return /reintegro/i.test(p.discount.text);
}

/** Lo grande de la tarjeta: el número primero, como en las ofertas del MVP 4. */
export function promoValue(p: BankPromo): { big: string; small: string } {
	const d = p.discount;
	if (d.kind === "percent") {
		const small = isRefund(p) ? "reintegro" : "descuento";
		if (p.percentRange && p.percentRange.min !== p.percentRange.max) {
			return { big: `${p.percentRange.min}–${p.percentRange.max}%`, small: `${small} según tu paquete` };
		}
		const pct = d.percent ?? p.percentRange?.max;
		if (pct != null) return { big: `${pct}%`, small };
	}
	if (d.kind === "installments" && d.installments != null) {
		return { big: String(d.installments), small: "cuotas sin interés" };
	}
	if (d.kind === "amount" && d.amount != null) {
		return { big: formatCurrency(d.amount), small: isRefund(p) ? "de reintegro" : "de descuento" };
	}
	return { big: d.text, small: "" };
}

/** Lo mismo, dicho completo para el lector de pantalla. */
export function promoValueSpoken(p: BankPromo): string {
	const v = promoValue(p);
	if (p.discount.kind === "percent" && p.percentRange && p.percentRange.min !== p.percentRange.max) {
		return `de ${p.percentRange.min} a ${p.percentRange.max}% de ${isRefund(p) ? "reintegro" : "descuento"} según tu paquete`;
	}
	if (p.discount.kind === "percent") return `${v.big} de ${v.small}`;
	return v.small ? `${v.big} ${v.small}` : v.big;
}

/** Con qué se paga. Una promo sin emisor identificado nunca se presenta como "todos los medios". */
export function issuersText(p: BankPromo): string {
	if (p.allMethods) return "Todos los medios de pago";
	if (p.issuers.length === 0) {
		// Sin emisor puede ser "no sabemos cuál" o "cualquier banco con tal red o tipo" (D17).
		return p.qualityFlags.includes("issuer_unknown") ? "Otros medios de pago" : "Tarjetas de cualquier banco";
	}
	return joinNames(
		p.issuers.map((i) => i.name),
		"o",
	);
}

/** "Visa · crédito · Patagonia Plus": lo que la promo pide además del emisor. */
export function requiresText(p: BankPromo): string | null {
	const r = p.requires;
	if (!r) return null;
	const parts = [
		r.network ? networkName(r.network) : null,
		r.cardType ? cardTypeName(r.cardType) : null,
		r.package ? `paquete ${r.package}` : null,
	].filter((x): x is string => !!x);
	return parts.length ? parts.join(" · ") : null;
}

export type ChipTone = "ok" | "near" | "neutral" | "info";
export type PromoChip = { text: string; tone: ChipTone; icon: "checkmark-circle" | "alert-circle-outline" | "remove-circle-outline" | "card-outline" | "location-outline" | "time-outline" | "storefront-outline" | "wallet-outline" };

/** El estado de match en palabras: "Con tu Galicia Visa", "Pide crédito". Ícono + texto, nunca sólo color. */
export function matchChip(p: BankPromo): PromoChip {
	switch (p.match) {
		case "match":
			return { text: p.matchReason ?? "Con tus tarjetas", tone: "ok", icon: "checkmark-circle" };
		case "all":
			return { text: p.matchReason ?? "Cualquier medio de pago", tone: "ok", icon: "card-outline" };
		case "near":
			return { text: p.matchReason ?? "No coincide del todo", tone: "near", icon: "alert-circle-outline" };
		default:
			return { text: p.matchReason ?? "No es de tus tarjetas", tone: "neutral", icon: "remove-circle-outline" };
	}
}

const CAP_PERIOD: Record<string, string> = { purchase: "por compra", day: "por día", week: "por semana", month: "por mes" };

export function capText(cap: BankPromo["cap"]): string | null {
	if (!cap) return null;
	const period = cap.period ? ` ${CAP_PERIOD[cap.period]}` : "";
	return `Tope ${formatCurrency(cap.amount)}${period}`;
}

export function channelText(channels: BankPromo["channels"]): string | null {
	const store = channels.includes("store");
	const online = channels.includes("online");
	if (store && online) return "En local y online";
	if (store) return "En local";
	if (online) return "Online";
	return null;
}

export function untilText(validTo: string): string {
	return `Hasta el ${shortDate(validTo)}`;
}

/** Los chips de una promo en la lista: match, tope, canal y vigencia (SPEC §5). */
export function promoChips(p: BankPromo): PromoChip[] {
	const chips: PromoChip[] = [matchChip(p)];
	const cap = capText(p.cap);
	if (cap) chips.push({ text: cap, tone: "neutral", icon: "wallet-outline" });
	const channel = channelText(p.channels);
	if (channel) chips.push({ text: channel, tone: "info", icon: "storefront-outline" });
	chips.push({ text: untilText(p.validTo), tone: "neutral", icon: "time-outline" });
	return chips;
}

// ── Orden y agrupado de un día ───────────────────────────────────────

const MATCH_RANK: Record<BankPromoMatch, number> = { match: 0, all: 0, near: 1, none: 2 };

/**
 * El orden del SPEC §4: match y all, después near y al final none (que sólo llega con "Todas").
 * Dentro de cada grupo los porcentajes de mayor a menor, y las cuotas y los montos debajo (D8).
 * El backend ya las manda así; se reordena igual para que la pantalla no dependa de eso.
 */
export function sortDayPromos(promos: BankPromo[], mine: boolean): BankPromo[] {
	return promos
		.filter((p) => !mine || p.match !== "none")
		.map((p, i) => ({ p, i }))
		.sort((a, b) => {
			const byMatch = MATCH_RANK[a.p.match] - MATCH_RANK[b.p.match];
			if (byMatch) return byMatch;
			const pa = promoPercent(a.p);
			const pb = promoPercent(b.p);
			if ((pa == null) !== (pb == null)) return pa == null ? 1 : -1;
			if (pa != null && pb != null && pa !== pb) return pb - pa;
			const ia = a.p.discount.installments ?? 0;
			const ib = b.p.discount.installments ?? 0;
			if (ia !== ib) return ib - ia;
			return a.i - b.i;
		})
		.map(({ p }) => p);
}

export type Retailer = { slug: string; name: string };
/** Una promo de la lista, con todas las cadenas donde vale. */
export type PromoEntry = { promo: BankPromo; retailers: Retailer[] };
export type PromoGroup = { key: string; retailers: Retailer[]; title: string; entries: PromoEntry[] };

/** Dos filas que para el usuario son la misma promo: todo igual menos la cadena y el id. */
function sameOfferSignature(p: BankPromo): string {
	const { id: _id, retailer: _r, retailerName: _rn, ...rest } = p;
	return JSON.stringify(rest);
}

/**
 * Agrupa una lista ya ordenada por súper (SPEC §5). La misma promo publicada en Jumbo, Disco y
 * Vea queda una sola vez, bajo "Jumbo, Disco y Vea". Los grupos salen en el orden de su mejor
 * promo, y cada uno conserva el orden de la lista.
 */
export function groupByRetailer(sorted: BankPromo[]): PromoGroup[] {
	const entries: PromoEntry[] = [];
	const bySignature = new Map<string, PromoEntry>();
	for (const promo of sorted) {
		const sig = sameOfferSignature(promo);
		const existing = bySignature.get(sig);
		if (existing) {
			if (!existing.retailers.some((r) => r.slug === promo.retailer)) {
				existing.retailers.push({ slug: promo.retailer, name: promo.retailerName });
			}
			continue;
		}
		const entry: PromoEntry = { promo, retailers: [{ slug: promo.retailer, name: promo.retailerName }] };
		bySignature.set(sig, entry);
		entries.push(entry);
	}

	const groups: PromoGroup[] = [];
	const byKey = new Map<string, PromoGroup>();
	for (const entry of entries) {
		const key = entry.retailers.map((r) => r.slug).join("+");
		let group = byKey.get(key);
		if (!group) {
			group = { key, retailers: entry.retailers, title: joinNames(entry.retailers.map((r) => r.name)), entries: [] };
			byKey.set(key, group);
			groups.push(group);
		}
		group.entries.push(entry);
	}
	return groups;
}

/**
 * "Lo mejor del día": el mayor % que el usuario puede usar. En "Todas", si no puede usar ninguna,
 * el mayor % del día igual, que el chip de match aclara de quién es.
 */
export function bestOfDay(sorted: BankPromo[], mine: boolean): BankPromo | null {
	const pick = (list: BankPromo[]) =>
		list.reduce<BankPromo | null>((best, p) => {
			const pct = promoPercent(p);
			if (pct == null) return best;
			const bestPct = best ? promoPercent(best) : null;
			return bestPct == null || pct > bestPct ? p : best;
		}, null);
	const usable = pick(sorted.filter((p) => p.match === "match" || p.match === "all"));
	if (usable || mine) return usable;
	return pick(sorted);
}

/** Desde qué día va la nota del cambio de mes, o null. */
export function rolloverFrom(week: Pick<BankPromoWeek, "notes">): string | null {
	const dates = week.notes.filter((n) => n.kind === "rollover").map((n) => n.fromDate);
	return dates.length ? dates.sort()[0] : null;
}

export function showsRollover(week: Pick<BankPromoWeek, "notes">, date: string): boolean {
	const from = rolloverFrom(week);
	return from != null && date >= from;
}

/**
 * Zona con la que se piden las promos. Por ahora la app es para CABA y GBA; el backend
 * toma "AMBA" como CABA + provincia de Buenos Aires. Cuando haya zona por usuario (OFT-16),
 * sale de ahí.
 */
export const USER_ZONE = "AMBA";

export const ROLLOVER_TEXT = "Las promos del mes que viene suelen publicarse los primeros días. Van a aparecer acá solas.";

/** Los días de la semana (1..7) en que aparece una promo, ordenados. */
export function promoWeekdays(week: Pick<BankPromoWeek, "days">, promoIds: number[]): number[] {
	const set = new Set<number>();
	for (const day of week.days) {
		if (day.promos.some((p) => promoIds.includes(p.id))) set.add(day.weekday);
	}
	return [...set].sort((a, b) => a - b);
}

/**
 * El texto de la tira de Inicio (OFT-56): "Hoy con tus tarjetas: hasta 30% en Carrefour".
 * `/today` ya trae sólo lo que el usuario puede usar; se toman las cadenas del mejor %.
 */
export function todayStripText(today: Pick<BankPromoToday, "bestPercent" | "promos">): { title: string; body: string } {
	const usable = today.promos.filter((p) => p.match === "match" || p.match === "all");
	const bestPct = today.bestPercent ?? usable.map(promoPercent).reduce<number | null>((m, x) => (x != null && (m == null || x > m) ? x : m), null);
	if (bestPct != null) {
		const names = [...new Set(usable.filter((p) => promoPercent(p) === bestPct).map((p) => p.retailerName))];
		const where = names.length ? ` en ${joinNames(names)}` : "";
		return { title: `Hoy con tus tarjetas: hasta ${bestPct}%${where}`, body: "Tocá para ver tope, condiciones y el resto de la semana." };
	}
	if (usable.length) {
		const first = usable[0];
		return { title: `Hoy con tus tarjetas: ${promoValueSpoken(first)} en ${first.retailerName}`, body: "Tocá para ver las condiciones y el resto de la semana." };
	}
	return { title: "Promos con tus tarjetas", body: "Hoy no hay ninguna. Mirá qué día de la semana te conviene." };
}

// ── Accesibilidad ────────────────────────────────────────────────────

/** "Martes, 30% de reintegro en Jumbo, Disco y Vea con Naranja X, hasta el 31 de octubre. Con tu Naranja X". */
export function promoA11yLabel(date: string, entry: PromoEntry): string {
	const p = entry.promo;
	const parts = [
		`${capitalize(DAY_LONG[weekdayOf(date) - 1])}, ${promoValueSpoken(p)} en ${joinNames(entry.retailers.map((r) => r.name))} con ${issuersText(p)}`,
		`hasta el ${longDate(p.validTo)}`,
	];
	const head = parts.join(", ");
	const extra = [matchChip(p).text, capText(p.cap), channelText(p.channels)].filter(Boolean).join(". ");
	return `${head}. ${extra}`;
}

/** "Hoy, domingo 1, hasta 30%" / "lunes 2, sin descuentos". */
export function dayChipA11y(date: string, isToday: boolean, bestPercent: number | null): string {
	const name = `${DAY_LONG[weekdayOf(date) - 1]} ${dayOfMonth(date)}`;
	const best = bestPercent != null ? `hasta ${bestPercent}%` : "sin descuentos";
	return `${isToday ? `Hoy, ${name}` : name}, ${best}`;
}

// ── Hoja de Condiciones (la misma de OFT-13) ─────────────────────────

const QUALITY_NOTES: Record<string, string> = {
	days_mismatch_legal: "Los días salen del texto legal: la página del súper indicaba otros. Confirmá antes de ir.",
	issuer_unknown: "El súper no dice con qué banco o billetera es. Revisá el texto legal.",
};

function legalLines(text: string | null): ConditionsLine[] {
	return (text ?? "")
		.split(/\n+/)
		.map((t) => t.trim())
		.filter(Boolean)
		.map((t) => ({ text: t, tone: "legal" as const }));
}

/**
 * Las condiciones de una promo bancaria en el formato de `PromoConditionsSheet`: con qué
 * tarjeta, días, vigencia, dónde, tope, requisitos y el legal entero (que es donde están las
 * exclusiones). Nada se lee del legal: va tal cual, como en OFT-13.
 */
export function bankPromoConditions(entry: PromoEntry, weekdays: number[]): PromoConditions {
	const p = entry.promo;
	const where = joinNames(entry.retailers.map((r) => r.name));
	const blocks: ConditionsBlock[] = [];
	const line = (text: string, tone: ConditionsLine["tone"] = "body"): ConditionsLine => ({ text, tone });

	const chip = matchChip(p);
	const req = requiresText(p);
	blocks.push({
		key: "match",
		kind: "applies",
		title: "Con qué pagar",
		lines: [
			line(issuersText(p)),
			...(req ? [line(`Pide ${req}`)] : []),
			line(chip.text, chip.tone === "near" ? "warning" : "body"),
		],
		full: null,
	});

	const days = weekdays.length
		? `Esta semana: ${joinNames(weekdays.map((d) => DAY_LONG[d - 1]))}`
		: "Días no informados";
	blocks.push({
		key: "when",
		kind: "validity",
		title: "Días y vigencia",
		lines: [line(days), line(`Del ${shortDate(p.validFrom)} al ${shortDate(p.validTo)}`)],
		full: null,
	});

	const channel = channelText(p.channels);
	blocks.push({
		key: "where",
		kind: "applies",
		title: "Dónde",
		lines: [line(where), ...(channel ? [line(channel)] : [])],
		full: null,
	});

	blocks.push({
		key: "cap",
		kind: "unitCap",
		title: "Tope",
		lines: [line(capText(p.cap) ?? "El súper no informa un tope.")],
		full: null,
	});

	const requisitos = [
		...p.conditions.map((c) => line(`Sólo para ${CONDITION_NAMES[c] ?? c}`)),
		...(p.regions?.length ? [line(`Sólo en ${joinNames(p.regions.map(provinceName))}`)] : []),
	];
	if (requisitos.length) blocks.push({ key: "req", kind: "notice", title: "Requisitos", lines: requisitos, full: null });

	const quality = p.qualityFlags.filter((f) => QUALITY_NOTES[f]).map((f) => line(QUALITY_NOTES[f], "warning"));
	if (quality.length) blocks.push({ key: "quality", kind: "notice", title: "Sobre este dato", lines: quality, full: null });

	const legal = legalLines(p.legalText);
	if (legal.length) blocks.push({ key: "legal", kind: "legal", title: "Texto legal", lines: legal, full: null });

	return {
		title: CONDITIONS_TITLE,
		subtitle: `${capitalize(promoValueSpoken(p))} con ${issuersText(p)} · ${where}`,
		blocks,
		full: null,
	};
}

// ── Mis tarjetas ─────────────────────────────────────────────────────

/** "Banco Galicia Visa crédito", "Mercado Pago". */
export function methodLabel(m: PaymentMethod, networks: CatalogOption[] = [], cardTypes: CatalogOption[] = []): string {
	const parts = [m.issuer.name];
	if (m.network) parts.push(networkName(m.network, networks));
	if (m.cardType && m.cardType !== "wallet") parts.push(cardTypeName(m.cardType, cardTypes));
	return parts.join(" ");
}

/** La segunda línea de la tarjeta: "Visa · Crédito", "Billetera virtual". */
export function methodDetail(m: PaymentMethod, networks: CatalogOption[] = [], cardTypes: CatalogOption[] = []): string {
	if (m.issuer.kind === "wallet" || m.cardType === "wallet") return "Billetera virtual";
	const net = m.network ? networkName(m.network, networks) : "Marca sin indicar";
	const type = m.cardType ? capitalize(cardTypeName(m.cardType, cardTypes)) : "Tipo sin indicar";
	return `${net} · ${type}`;
}

export function toInput(m: PaymentMethod): PaymentMethodInput {
	return { issuerSlug: m.issuer.slug, network: m.network, cardType: m.cardType };
}

/** La misma tarjeta para la base (UNIQUE de emisor, red y tipo). */
export function sameMethod(a: PaymentMethodInput, b: PaymentMethodInput): boolean {
	return a.issuerSlug === b.issuerSlug && (a.network ?? null) === (b.network ?? null) && (a.cardType ?? null) === (b.cardType ?? null);
}

/** Iniciales del emisor para el círculo de la lista: "Banco Galicia" → "GA", "Mercado Pago" → "MP". */
export function issuerInitials(name: string): string {
	return initialsFrom(name.replace(/^banco\s+/i, ""));
}

function normalize(s: string): string {
	return s
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.trim();
}

/**
 * Los emisores que se pueden sumar como tarjeta, filtrados por la búsqueda (sin tildes ni
 * mayúsculas). Los clubes (Club La Nación, Jumbo+) no: se declaran con los switches de beneficios.
 */
export function filterIssuers(issuers: CatalogIssuer[], query: string): CatalogIssuer[] {
	const q = normalize(query);
	return issuers.filter((i) => i.kind !== "club" && (!q || normalize(i.name).includes(q) || normalize(i.slug).includes(q)));
}

export function isWallet(issuer: Pick<CatalogIssuer, "kind">): boolean {
	return issuer.kind === "wallet";
}

// ── Alta en 3 pasos ──────────────────────────────────────────────────

export type AddStep = "issuer" | "network" | "cardType" | "confirm";
export type AddDraft = {
	step: AddStep;
	issuer: CatalogIssuer | null;
	network: string | null;
	cardType: string | null;
};

export const EMPTY_DRAFT: AddDraft = { step: "issuer", issuer: null, network: null, cardType: null };

/** Paso 1. Una billetera no tiene marca ni tipo: va directo a confirmar. */
export function chooseIssuer(issuer: CatalogIssuer): AddDraft {
	if (isWallet(issuer)) return { step: "confirm", issuer, network: null, cardType: "wallet" };
	return { step: "network", issuer, network: null, cardType: null };
}

/** Paso 2. `null` es "No sé": la promo de ese banco se muestra igual, con cualquier marca. */
export function chooseNetwork(draft: AddDraft, network: string | null): AddDraft {
	return { ...draft, step: "cardType", network };
}

/** Paso 3. */
export function chooseCardType(draft: AddDraft, cardType: string): AddDraft {
	return { ...draft, step: "confirm", cardType };
}

/** "Atrás" dentro del alta; null = salir del alta. */
export function stepBack(draft: AddDraft): AddDraft | null {
	switch (draft.step) {
		case "issuer":
			return null;
		case "network":
			return EMPTY_DRAFT;
		case "cardType":
			return { ...draft, step: "network", cardType: null };
		case "confirm":
			if (draft.issuer && isWallet(draft.issuer)) return EMPTY_DRAFT;
			return { ...draft, step: "cardType" };
	}
}

/** "Paso 2 de 3" mientras se elige; null en la confirmación (a la que una billetera llega desde el paso 1). */
export function stepProgress(draft: AddDraft): { current: number; total: 3 } | null {
	const order: AddStep[] = ["issuer", "network", "cardType"];
	const i = order.indexOf(draft.step);
	return i < 0 ? null : { current: i + 1, total: 3 };
}

export function draftToInput(draft: AddDraft): PaymentMethodInput | null {
	if (draft.step !== "confirm" || !draft.issuer) return null;
	return { issuerSlug: draft.issuer.slug, network: draft.network, cardType: draft.cardType };
}
