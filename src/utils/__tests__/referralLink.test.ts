import { describe, expect, it } from "vitest";
import { referralCodeFromUrl, referralLink } from "../referralLink";

describe("referralCodeFromUrl", () => {
	it("lee el código del link y lo pasa a mayúsculas", () => {
		expect(referralCodeFromUrl("ofertar://referido/ab12cd34")).toBe("AB12CD34");
		expect(referralCodeFromUrl("ofertar://referido/AB12CD34/")).toBe("AB12CD34");
	});

	it("ignora cualquier otro link", () => {
		expect(referralCodeFromUrl("ofertar://otra/AB12CD34")).toBeNull();
		expect(referralCodeFromUrl("https://evil.example/referido/AB12CD34")).toBeNull();
		expect(referralCodeFromUrl("ofertar://referido/<script>")).toBeNull();
		expect(referralCodeFromUrl(null)).toBeNull();
	});
});

describe("referralLink", () => {
	it("apunta a la página pública del código", () => {
		expect(referralLink("AB12CD34")).toMatch(/\/r\/AB12CD34$/);
	});
});
