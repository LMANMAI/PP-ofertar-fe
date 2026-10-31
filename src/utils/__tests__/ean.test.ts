import { describe, expect, it } from "vitest";
import { includesEan, isFollowableEan, isFollowedPurchase, normalizeEan, sameEan } from "../ean";

// Los mismos casos que ProductoImagenService.normalizarEan en el backend: si la app y el backend
// normalizan distinto, el escáner diría "Seguir" sobre algo que el backend ya tiene seguido.
describe("normalizeEan", () => {
	it.each([
		["EAN-13 tal cual", "7790895000997", "7790895000997"],
		["EAN-13 que empieza con cero queda igual", "0790895000997", "0790895000997"],
		["GTIN-14 con un cero adelante pasa a 13", "07790895000997", "7790895000997"],
		["con varios ceros adelante también", "0007790895000997", "7790895000997"],
		["14 dígitos sin cero adelante quedan en 14", "17790895000997", "17790895000997"],
		["se descartan espacios y guiones", " 779-0895 000997 ", "7790895000997"],
		["EAN-8 se completa a 13", "77901234", "0000077901234"],
		["un código corto (UPC-E) también se completa", "123456", "0000000123456"],
	])("%s", (_caso, entrada, esperado) => {
		expect(normalizeEan(entrada)).toBe(esperado);
	});

	it.each([
		["null", null],
		["vacío", ""],
		["sin dígitos", "abc"],
		["más de 14 dígitos que no son ceros adelante", "123456789012345"],
		["todos ceros", "0000000000000"],
		["un solo dígito repetido", "1111111111111"],
		["un dígito suelto, que completado son todos ceros", "0"],
	])("descarta %s", (_caso, entrada) => {
		expect(normalizeEan(entrada)).toBeNull();
	});
});

describe("sameEan", () => {
	it("el GTIN-14 y su EAN-13 son el mismo producto", () => {
		expect(sameEan("07790895000997", "7790895000997")).toBe(true);
		expect(sameEan("7790895000997", "07790895000997")).toBe(true);
	});

	it("dos códigos distintos no", () => {
		expect(sameEan("7790895000997", "7790895000980")).toBe(false);
	});

	it("un código que la regla descarta solo es igual a sí mismo", () => {
		expect(sameEan("0000000000000", "0000000000000")).toBe(true);
		expect(sameEan("0000000000000", "00000000000000")).toBe(false);
		expect(sameEan("0000000000000", "7790895000997")).toBe(false);
	});
});

describe("isFollowableEan", () => {
	it("acepta de 8 a 14 dígitos, como el backend", () => {
		expect(isFollowableEan("77901234")).toBe(true);
		expect(isFollowableEan("7790895000997")).toBe(true);
		expect(isFollowableEan("07790895000997")).toBe(true);
	});

	it("un UPC-E de 6 dígitos, uno de 15 o uno con otros caracteres no", () => {
		expect(isFollowableEan("123456")).toBe(false);
		expect(isFollowableEan("1234567")).toBe(false);
		expect(isFollowableEan("123456789012345")).toBe(false);
		expect(isFollowableEan("7790895 000997")).toBe(false);
	});
});

describe("un producto comprado que también se sigue", () => {
	const leche = { barcode: "7791337007253", followed: false };

	it("includesEan encuentra el código en cualquiera de los dos formatos", () => {
		expect(includesEan(["07791337007253"], "7791337007253")).toBe(true);
		expect(includesEan(["7791337007253"], "07791337007253")).toBe(true);
		expect(includesEan([], "7791337007253")).toBe(false);
	});

	it("sin los códigos del escáner leídos vale lo que dijo el backend", () => {
		expect(isFollowedPurchase(leche, null)).toBe(false);
		expect(isFollowedPurchase({ ...leche, followed: true }, null)).toBe(true);
	});

	it("con los códigos leídos valen ellos: lo que se siguió o se dejó de seguir después", () => {
		expect(isFollowedPurchase(leche, ["07791337007253"])).toBe(true);
		expect(isFollowedPurchase({ ...leche, followed: true }, [])).toBe(false);
	});

	it("sin código de barras no hay con qué comparar y vale lo del backend", () => {
		expect(isFollowedPurchase({ barcode: null, followed: true }, [])).toBe(true);
	});
});
