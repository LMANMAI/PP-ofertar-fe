import { describe, expect, it } from "vitest";
import { promo, week } from "../../api/__tests__/bankPromosFixtures";
import type { BankPromo, CatalogIssuer } from "../../services/bankPromosApi";
import {
	EMPTY_DRAFT,
	addDays,
	argentinaToday,
	bankPromoConditions,
	bestOfDay,
	chooseCardType,
	chooseIssuer,
	chooseNetwork,
	dayChipA11y,
	dayTitle,
	draftToInput,
	filterIssuers,
	groupByRetailer,
	issuerInitials,
	issuersText,
	matchChip,
	methodDetail,
	methodLabel,
	promoA11yLabel,
	promoChips,
	promoValue,
	promoWeekdays,
	sameMethod,
	shortDate,
	showsRollover,
	sortDayPromos,
	stepBack,
	stepProgress,
	todayStripText,
	weekdayOf,
} from "../bankPromos";

const pct = (n: number, over: Partial<BankPromo> = {}) =>
	promo({ discount: { kind: "percent", percent: n, text: `${n}% de descuento` }, ...over });
const cuotas = (n: number, over: Partial<BankPromo> = {}) =>
	promo({ discount: { kind: "installments", installments: n, text: `${n} cuotas sin interés` }, ...over });
const monto = (n: number, over: Partial<BankPromo> = {}) =>
	promo({ discount: { kind: "amount", amount: n, text: `$${n} de descuento` }, ...over });

describe("fechas", () => {
	it("hoy en Argentina: a las 23:30 del 31/10 en Buenos Aires ya es 1/11 en UTC, pero sigue siendo 31/10", () => {
		expect(argentinaToday(new Date("2026-11-01T02:30:00Z"))).toBe("2026-10-31");
		expect(argentinaToday(new Date("2026-11-01T03:30:00Z"))).toBe("2026-11-01");
	});

	it("weekday 1=lunes … 7=domingo y suma de días cruzando el mes", () => {
		expect(weekdayOf("2026-11-01")).toBe(7);
		expect(weekdayOf("2026-11-02")).toBe(1);
		expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
		expect(shortDate("2026-11-30")).toBe("30/11");
	});

	it("título del día: 'Hoy, domingo 1 de noviembre' o con mayúscula inicial", () => {
		expect(dayTitle("2026-11-01", true)).toBe("Hoy, domingo 1 de noviembre");
		expect(dayTitle("2026-11-07", false)).toBe("Sábado 7 de noviembre");
	});
});

describe("orden dentro de un día (SPEC §4 y D8)", () => {
	it("match y all primero, después near, al final none; y none no aparece con mine=true", () => {
		const none = pct(40, { match: "none" });
		const near = pct(35, { match: "near" });
		const all = pct(10, { match: "all" });
		const match = pct(20, { match: "match" });
		expect(sortDayPromos([none, near, all, match], false).map((p) => p.match)).toEqual(["match", "all", "near", "none"]);
		expect(sortDayPromos([none, near, all, match], true).map((p) => p.match)).toEqual(["match", "all", "near"]);
	});

	it("dentro del grupo, % de mayor a menor; cuotas y montos debajo de los % (D8)", () => {
		const list = [cuotas(6), pct(10), monto(5000), pct(30), cuotas(12), pct(20)];
		const sorted = sortDayPromos(list, true);
		expect(sorted.map((p) => p.discount.kind)).toEqual(["percent", "percent", "percent", "installments", "installments", "amount"]);
		expect(sorted.slice(0, 3).map((p) => p.discount.percent)).toEqual([30, 20, 10]);
		expect(sorted[3].discount.installments).toBe(12);
	});

	it("un % alto que no podés usar no pasa por encima de uno chico que sí", () => {
		const sorted = sortDayPromos([pct(40, { match: "near" }), pct(5, { match: "match" })], true);
		expect(sorted[0].discount.percent).toBe(5);
	});

	it("con variantes por paquete ordena por el mínimo, no por el máximo", () => {
		const paquete = promo({ discount: { kind: "percent", text: "15–35%" }, percentRange: { min: 15, max: 35 } });
		expect(sortDayPromos([paquete, pct(20)], true)[0].discount.percent).toBe(20);
	});

	it("a igual %, se respeta el orden en que llegaron", () => {
		const a = pct(20, { title: "a" });
		const b = pct(20, { title: "b" });
		expect(sortDayPromos([a, b], true).map((p) => p.title)).toEqual(["a", "b"]);
	});
});

describe("agrupado por súper", () => {
	it("la misma promo en Jumbo, Disco y Vea queda una vez, bajo las tres cadenas", () => {
		const base = { title: "Martes Naranja X", issuers: [{ slug: "naranja-x", name: "Naranja X" }] };
		const list = [
			pct(30, { ...base, id: 11, retailer: "jumbo", retailerName: "Jumbo" }),
			pct(30, { ...base, id: 12, retailer: "disco", retailerName: "Disco" }),
			pct(30, { ...base, id: 13, retailer: "vea", retailerName: "Vea" }),
		];
		const groups = groupByRetailer(list);
		expect(groups).toHaveLength(1);
		expect(groups[0].title).toBe("Jumbo, Disco y Vea");
		expect(groups[0].entries).toHaveLength(1);
		expect(groups[0].entries[0].retailers.map((r) => r.slug)).toEqual(["jumbo", "disco", "vea"]);
	});

	it("los grupos salen en el orden de su mejor promo y cada uno conserva el orden de la lista", () => {
		const sorted = sortDayPromos(
			[
				pct(10, { retailer: "carrefour", retailerName: "Carrefour", title: "cf10" }),
				pct(30, { retailer: "jumbo", retailerName: "Jumbo", title: "ju30" }),
				pct(20, { retailer: "carrefour", retailerName: "Carrefour", title: "cf20" }),
			],
			true,
		);
		const groups = groupByRetailer(sorted);
		expect(groups.map((g) => g.title)).toEqual(["Jumbo", "Carrefour"]);
		expect(groups[1].entries.map((e) => e.promo.title)).toEqual(["cf20", "cf10"]);
	});

	it("dos promos distintas del mismo súper no se juntan", () => {
		const groups = groupByRetailer([pct(30, { title: "a" }), pct(30, { title: "b" })]);
		expect(groups[0].entries).toHaveLength(2);
	});
});

describe("lo mejor del día", () => {
	it("el mayor % que el usuario puede usar, ignorando cuotas", () => {
		const list = sortDayPromos([pct(40, { match: "near" }), pct(25, { match: "match" }), cuotas(12, { match: "match" })], true);
		expect(bestOfDay(list, true)?.discount.percent).toBe(25);
	});

	it("con 'Todas' y ninguna usable, el mayor del día; con mis tarjetas, nada", () => {
		const list = [pct(40, { match: "none" }), pct(15, { match: "near" })];
		expect(bestOfDay(sortDayPromos(list, false), false)?.discount.percent).toBe(40);
		expect(bestOfDay(sortDayPromos(list, true), true)).toBeNull();
	});
});

describe("textos y chips (nunca sólo color)", () => {
	it("chip de match con ícono y texto, también sin matchReason", () => {
		expect(matchChip(promo({ match: "match", matchReason: "Con tu Galicia Visa" }))).toMatchObject({ text: "Con tu Galicia Visa", tone: "ok", icon: "checkmark-circle" });
		expect(matchChip(promo({ match: "near", matchReason: null }))).toMatchObject({ text: "No coincide del todo", tone: "near" });
		expect(matchChip(promo({ match: "all", matchReason: null })).text).toBe("Cualquier medio de pago");
		expect(matchChip(promo({ match: "none", matchReason: null })).text).toBe("No es de tus tarjetas");
	});

	it("chips: match, tope, canal y 'Hasta el 30/11'", () => {
		expect(promoChips(promo({ channels: ["store"] })).map((c) => c.text)).toEqual([
			"Con tu Banco Galicia Visa crédito",
			"Tope $20.000 por mes",
			"En local",
			"Hasta el 30/11",
		]);
		expect(promoChips(promo({ cap: null, channels: ["online"] })).map((c) => c.text)).toEqual([
			"Con tu Banco Galicia Visa crédito",
			"Online",
			"Hasta el 30/11",
		]);
	});

	it("valor: %, reintegro, rango por paquete y cuotas", () => {
		expect(promoValue(pct(25))).toEqual({ big: "25%", small: "descuento" });
		expect(promoValue(promo({ discount: { kind: "percent", percent: 30, text: "30% de reintegro" } })).small).toBe("reintegro");
		expect(promoValue(promo({ discount: { kind: "percent", percent: 20, text: "20%" }, percentRange: { min: 15, max: 35 } })).big).toBe("15–35%");
		expect(promoValue(cuotas(4))).toEqual({ big: "4", small: "cuotas sin interés" });
	});

	it("una promo sin emisor identificado nunca dice 'todos los medios'", () => {
		expect(issuersText(promo({ issuers: [], allMethods: false, qualityFlags: ["issuer_unknown"] }))).toBe("Otros medios de pago");
		expect(issuersText(promo({ issuers: [], allMethods: false, qualityFlags: [] }))).toBe("Tarjetas de cualquier banco");
		expect(issuersText(promo({ issuers: [], allMethods: true }))).toBe("Todos los medios de pago");
		expect(issuersText(promo({ issuers: [{ slug: "a", name: "MODO" }, { slug: "b", name: "Mercado Pago" }] }))).toBe("MODO o Mercado Pago");
	});

	it("accesibilidad: la promo se lee en una frase completa", () => {
		const entry = { promo: pct(30, { matchReason: "Con tu Naranja X", issuers: [{ slug: "naranja-x", name: "Naranja X" }], cap: null, channels: ["store"], validTo: "2026-11-30" }), retailers: [{ slug: "jumbo", name: "Jumbo" }, { slug: "disco", name: "Disco" }] };
		expect(promoA11yLabel("2026-11-03", entry)).toBe("Martes, 30% de descuento en Jumbo y Disco con Naranja X, hasta el 30 de noviembre. Con tu Naranja X. En local");
		expect(dayChipA11y("2026-11-01", true, 30)).toBe("Hoy, domingo 1, hasta 30%");
		expect(dayChipA11y("2026-11-02", false, null)).toBe("lunes 2, sin descuentos");
	});
});

describe("nota del cambio de mes", () => {
	it("aparece desde fromDate en adelante", () => {
		expect(showsRollover(week, "2026-11-04")).toBe(false);
		expect(showsRollover(week, "2026-11-05")).toBe(true);
		expect(showsRollover(week, "2026-11-07")).toBe(true);
		expect(showsRollover({ notes: [] }, "2026-11-07")).toBe(false);
	});
});

describe("hoja de Condiciones (reutiliza la de OFT-13)", () => {
	it("días de la semana, tope, requisitos, aviso de calidad y legal entero", () => {
		const p = pct(25, { conditions: ["jubilado"], regions: ["CORDOBA"], qualityFlags: ["days_mismatch_legal", "flag_que_no_conocemos"] });
		const c = bankPromoConditions({ promo: p, retailers: [{ slug: "carrefour", name: "Carrefour" }] }, [2, 4]);
		const byKey = Object.fromEntries(c.blocks.map((b) => [b.key, b]));
		expect(c.title).toBe("Condiciones de la promoción");
		expect(byKey.when.lines[0].text).toBe("Esta semana: martes y jueves");
		expect(byKey.cap.lines[0].text).toBe("Tope $20.000 por mes");
		expect(byKey.req.lines.map((l) => l.text)).toEqual(["Sólo para jubilados y pensionados", "Sólo en Córdoba"]);
		expect(byKey.quality.lines).toHaveLength(1);
		expect(byKey.quality.lines[0].tone).toBe("warning");
		expect(byKey.legal.lines[0]).toEqual({ text: p.legalText, tone: "legal" });
		expect(c.full).toBeNull();
	});

	it("los días salen de la semana devuelta", () => {
		expect(promoWeekdays(week, [2])).toEqual([2, 4]);
		expect(promoWeekdays(week, [999])).toEqual([]);
	});
});

describe("tira de Inicio (OFT-56)", () => {
	it("'Hoy con tus tarjetas: hasta 30% en Carrefour'", () => {
		const t = todayStripText({ bestPercent: 30, promos: [pct(30), pct(10, { retailer: "jumbo", retailerName: "Jumbo" })] });
		expect(t.title).toBe("Hoy con tus tarjetas: hasta 30% en Carrefour");
	});

	it("sólo cuotas: las dice; sin nada: invita a mirar la semana", () => {
		expect(todayStripText({ bestPercent: null, promos: [cuotas(4)] }).title).toBe("Hoy con tus tarjetas: 4 cuotas sin interés en Carrefour");
		expect(todayStripText({ bestPercent: null, promos: [] }).title).toBe("Promos con tus tarjetas");
	});
});

describe("Mis tarjetas", () => {
	const galicia: CatalogIssuer = { slug: "banco-galicia", name: "Banco Galicia", kind: "bank" };
	const mp: CatalogIssuer = { slug: "mercado-pago", name: "Mercado Pago", kind: "wallet" };
	const club: CatalogIssuer = { slug: "club-la-nacion", name: "Club La Nación", kind: "club" };

	it("etiquetas sin números: 'Banco Galicia Visa crédito', 'Billetera virtual'", () => {
		const m = { id: 1, issuer: galicia, network: "visa", cardType: "credit" };
		expect(methodLabel(m)).toBe("Banco Galicia Visa crédito");
		expect(methodDetail(m)).toBe("Visa · Crédito");
		expect(methodDetail({ id: 2, issuer: mp, network: null, cardType: "wallet" })).toBe("Billetera virtual");
		expect(methodDetail({ id: 3, issuer: galicia, network: null, cardType: null })).toBe("Marca sin indicar · Tipo sin indicar");
	});

	it("búsqueda sin tildes ni mayúsculas; los clubes no se suman como tarjeta", () => {
		const nacion: CatalogIssuer = { slug: "banco-nacion", name: "Banco Nación", kind: "bank" };
		expect(filterIssuers([galicia, nacion, mp, club], "nacion").map((i) => i.slug)).toEqual(["banco-nacion"]);
		expect(filterIssuers([galicia, nacion, mp, club], "").map((i) => i.slug)).toEqual(["banco-galicia", "banco-nacion", "mercado-pago"]);
	});

	it("iniciales sin el 'Banco'", () => {
		expect(issuerInitials("Banco Galicia")).toBe("GA");
		expect(issuerInitials("Mercado Pago")).toBe("MP");
	});

	it("la misma tarjeta (para la clave única) trata ausente y null igual", () => {
		expect(sameMethod({ issuerSlug: "a", network: null }, { issuerSlug: "a" })).toBe(true);
		expect(sameMethod({ issuerSlug: "a", network: "visa" }, { issuerSlug: "a" })).toBe(false);
	});

	it("alta de un banco: emisor → marca → tipo → confirmar, y atrás deshace paso a paso", () => {
		let d = chooseIssuer(galicia);
		expect(d.step).toBe("network");
		expect(stepProgress(d)).toEqual({ current: 2, total: 3 });
		d = chooseNetwork(d, "visa");
		expect(d.step).toBe("cardType");
		d = chooseCardType(d, "credit");
		expect(d.step).toBe("confirm");
		expect(stepProgress(d)).toBeNull();
		expect(draftToInput(d)).toEqual({ issuerSlug: "banco-galicia", network: "visa", cardType: "credit" });
		expect(stepBack(d)?.step).toBe("cardType");
		expect(stepBack(stepBack(d)!)?.step).toBe("network");
		expect(stepBack(EMPTY_DRAFT)).toBeNull();
	});

	it("una billetera salta directo a confirmar, sin marca, y atrás vuelve a elegir emisor", () => {
		const d = chooseIssuer(mp);
		expect(d).toMatchObject({ step: "confirm", network: null, cardType: "wallet" });
		expect(draftToInput(d)).toEqual({ issuerSlug: "mercado-pago", network: null, cardType: "wallet" });
		expect(stepBack(d)).toEqual(EMPTY_DRAFT);
	});

	it("'No sé' la marca guarda la red vacía", () => {
		const d = chooseCardType(chooseNetwork(chooseIssuer(galicia), null), "debit");
		expect(draftToInput(d)).toEqual({ issuerSlug: "banco-galicia", network: null, cardType: "debit" });
	});

	it("sin confirmar no hay nada para guardar", () => {
		expect(draftToInput(chooseIssuer(galicia))).toBeNull();
	});
});
