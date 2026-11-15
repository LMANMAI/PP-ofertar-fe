import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	disableTelemetry,
	flush,
	initTelemetry,
	normalizePath,
	outcomeOfStatus,
	pendingEvents,
	resetTelemetry,
	setAppActive,
	trackApiRequest,
	trackError,
	trackEvent,
	trackScreen,
} from "../core";

type Lote = { installId: string; platform: string; events: { type: string; name?: string }[] };

function iniciar(transport: (url: string, body: string) => Promise<void>) {
	initTelemetry({ endpoint: "https://api.test/telemetry/events", installId: "install-0001", platform: "android", appVersion: "1.0.0", transport });
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-11-11T12:00:00Z"));
	resetTelemetry();
});

afterEach(() => {
	resetTelemetry();
	vi.useRealTimers();
});

describe("normalizePath", () => {
	it("reemplaza ids, códigos y valores libres; deja lo fijo", () => {
		expect(normalizePath("/offers")).toBe("/offers");
		expect(normalizePath("/tickets/42")).toBe("/tickets/{id}");
		expect(normalizePath("/sepa/productos/7790001000019?lat=-34.6&lng=-58.4")).toBe("/sepa/productos/{id}");
		expect(normalizePath("/products/followed/7790001000019/alerts")).toBe("/products/followed/{id}/alerts");
		expect(normalizePath("/stores/La%20Anonima")).toBe("/stores/{id}");
		expect(normalizePath("/auth/verify-reset-code")).toBe("/auth/verify-reset-code");
	});
});

describe("outcomeOfStatus", () => {
	it("agrupa el estado HTTP", () => {
		expect(outcomeOfStatus(204)).toBe("ok");
		expect(outcomeOfStatus(401)).toBe("http_4xx");
		expect(outcomeOfStatus(502)).toBe("http_5xx");
	});
});

describe("cola y envío", () => {
	it("sin iniciar solo acumula; al iniciar manda el lote con los datos de la instalación", async () => {
		const transport = vi.fn().mockResolvedValue(undefined);
		trackEvent("ticket_upload_ok");
		await flush();
		expect(transport).not.toHaveBeenCalled();

		iniciar(transport);
		await flush();
		expect(transport).toHaveBeenCalledOnce();
		const [url, body] = transport.mock.calls[0];
		const lote = JSON.parse(body) as Lote;
		expect(url).toBe("https://api.test/telemetry/events");
		expect(lote.installId).toBe("install-0001");
		expect(lote.platform).toBe("android");
		expect(lote.events.map((e) => e.type)).toEqual(["event", "session_start"]);
		expect(pendingEvents()).toHaveLength(0);
	});

	it("vacía la cola sola cada 30 segundos", async () => {
		const transport = vi.fn().mockResolvedValue(undefined);
		iniciar(transport);
		await vi.advanceTimersByTimeAsync(30_000);
		expect(transport).toHaveBeenCalledOnce();
	});

	it("si el envío falla, los eventos vuelven a la cola y espera antes de reintentar", async () => {
		const transport = vi.fn().mockRejectedValueOnce(new Error("sin red")).mockResolvedValue(undefined);
		iniciar(transport);
		await flush();
		expect(pendingEvents()).toHaveLength(1);

		await flush(); // todavía dentro de la espera
		expect(transport).toHaveBeenCalledOnce();

		vi.advanceTimersByTime(30_001);
		await flush();
		expect(transport).toHaveBeenCalledTimes(2);
		expect(pendingEvents()).toHaveLength(0);
	});

	it("la cola tiene tope: sin conexión se pierde lo más viejo", () => {
		for (let i = 0; i < 250; i++) trackEvent(`e${i}`);
		expect(pendingEvents()).toHaveLength(200);
		expect(pendingEvents()[0].name).toBe("e50");
	});

	it("apagada no acumula ni manda", async () => {
		const transport = vi.fn().mockResolvedValue(undefined);
		disableTelemetry();
		iniciar(transport);
		trackEvent("x");
		trackError("js", new Error("boom"));
		await flush();
		expect(pendingEvents()).toHaveLength(0);
		expect(transport).not.toHaveBeenCalled();
	});
});

describe("pantallas", () => {
	it("cuenta cada cambio una vez e informa cuánto duró la anterior", () => {
		trackScreen("Main.home");
		trackScreen("Main.home");
		vi.advanceTimersByTime(5_000);
		trackScreen("OfferDetail");
		expect(pendingEvents()).toEqual([
			{ type: "screen_view", name: "Main.home" },
			{ type: "screen_time", name: "Main.home", durationMs: 5_000 },
			{ type: "screen_view", name: "OfferDetail" },
		]);
	});

	it("el tiempo en segundo plano no cuenta como tiempo en pantalla", () => {
		trackScreen("Main.home");
		vi.advanceTimersByTime(2_000);
		setAppActive(false);
		vi.advanceTimersByTime(60_000);
		setAppActive(true);
		vi.advanceTimersByTime(1_000);
		trackScreen("Profile");
		const tiempos = pendingEvents().filter((e) => e.type === "screen_time").map((e) => e.durationMs);
		expect(tiempos).toEqual([2_000, 1_000]);
	});
});

describe("pedidos y errores", () => {
	it("un pedido queda por método y endpoint normalizado; los de telemetría no se miden", () => {
		trackApiRequest("GET", "/tickets/42", "ok", 123.6);
		trackApiRequest("POST", "/telemetry/events", "ok", 10);
		expect(pendingEvents()).toEqual([{ type: "api_request", name: "GET /tickets/{id}", outcome: "ok", durationMs: 124 }]);
	});

	it("un error lleva tipo, mensaje, pantalla y si fue fatal", () => {
		trackScreen("ScanBarcode");
		trackError("js", new TypeError("x is undefined"), true);
		const error = pendingEvents().find((e) => e.type === "error");
		expect(error).toMatchObject({ name: "js", message: "TypeError: x is undefined", screen: "ScanBarcode", fatal: true });
		expect(error?.stack).toContain("TypeError");
	});

	it("un error en bucle se corta a los 20", () => {
		for (let i = 0; i < 50; i++) trackError("promise", `falla ${i}`);
		expect(pendingEvents().filter((e) => e.type === "error")).toHaveLength(20);
	});
});
