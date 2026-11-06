import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import { sendTestPush } from "../../services/pushApi";
import { requestTestPush, runTestPush, startsCooldown, TEST_PUSH_MESSAGES } from "../testPush";

function respuesta(status: number, cuerpo?: unknown): Response {
	return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

const enviado = {
	type: "test",
	sent: true,
	message: "Te mandamos una notificación de prueba. Puede tardar unos segundos.",
	devices: [{ platform: "android", tokenSuffix: "a1b2c]", status: "ok", message: null, error: null }],
};

afterEach(() => vi.unstubAllGlobals());

describe("sendTestPush (cliente)", () => {
	it("hace POST /push/test con el token de la sesión y el tipo en el cuerpo", async () => {
		const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { ...enviado, type: "offers" }));
		vi.stubGlobal("fetch", fetchMock);

		const r = await sendTestPush("SESION", "offers");

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toMatch(/\/push\/test$/);
		expect(init.method).toBe("POST");
		expect(init.headers.Authorization).toBe("Bearer SESION");
		expect(JSON.parse(init.body)).toEqual({ type: "offers" });
		expect(r.devices[0].status).toBe("ok");
	});

	it("sin tipo manda la prueba genérica", async () => {
		const fetchMock = vi.fn().mockResolvedValue(respuesta(200, enviado));
		vi.stubGlobal("fetch", fetchMock);

		await sendTestPush("SESION");

		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ type: "test" });
	});

	it("429: ApiError con el status, para que la pantalla lo distinga", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(429, { status: 429, message: "Esperá" })));

		const e = await sendTestPush("SESION").catch((err: unknown) => err);

		expect(e).toBeInstanceOf(ApiError);
		expect((e as ApiError).status).toBe(429);
	});

	it("valida la respuesta contra el contrato (status desconocido: aviso en modo report)", async () => {
		const malo = { ...enviado, devices: [{ ...enviado.devices[0], status: "maybe" }] };
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(200, malo)));
		const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});

		await sendTestPush("SESION");

		expect(aviso).toHaveBeenCalledOnce();
		expect(String(aviso.mock.calls[0][0])).toContain("POST /push/test");
		aviso.mockRestore();
	});
});

describe("requestTestPush (lo que ve el usuario)", () => {
	it("enviado: mensaje de éxito y arranca el cooldown", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(200, enviado)));

		const r = await requestTestPush("SESION");

		expect(r).toEqual({ kind: "sent", message: TEST_PUSH_MESSAGES.sent });
		expect(startsCooldown(r)).toBe(true);
	});

	it("429: pide esperar unos segundos, sin tratarlo como error", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(429, { status: 429, message: "x" })));

		const r = await requestTestPush("SESION");

		expect(r.kind).toBe("rateLimited");
		expect(r.message).toBe("Esperá unos segundos antes de probar de nuevo");
		expect(startsCooldown(r)).toBe(true);
	});

	it("sin dispositivos: invita a activar las notificaciones", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(respuesta(200, { ...enviado, sent: false, devices: [], message: "x" })),
		);

		const r = await requestTestPush("SESION");

		expect(r.kind).toBe("noDevices");
		expect(r.message).toMatch(/Activá las alertas/);
	});

	it("Expo rechazó todos los dispositivos: error entendible", async () => {
		const fallido = {
			...enviado,
			sent: false,
			devices: [{ ...enviado.devices[0], status: "error", message: "not registered", error: "DeviceNotRegistered" }],
		};
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(200, fallido)));

		expect((await requestTestPush("SESION")).kind).toBe("failed");
	});

	it("sin conexión: mensaje de red, y no arranca el cooldown (el pedido puede no haber llegado)", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network request failed")));

		const r = await requestTestPush("SESION");

		expect(r).toEqual({ kind: "error", message: TEST_PUSH_MESSAGES.offline });
		expect(startsCooldown(r)).toBe(false);
	});

	it("error del servidor: mensaje genérico, nunca el detalle crudo", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(500, { status: 500, message: "Error interno del servidor" })));

		expect(await requestTestPush("SESION")).toEqual({ kind: "error", message: TEST_PUSH_MESSAGES.generic });
	});
});

describe("runTestPush (el botón: registra el teléfono y después prueba)", () => {
	it("con permiso: registra el teléfono antes de pedir la prueba, aunque las alertas estén apagadas", async () => {
		const orden: string[] = [];
		vi.stubGlobal(
			"fetch",
			vi.fn().mockImplementation(async () => {
				orden.push("test");
				return respuesta(200, enviado);
			}),
		);
		const ensureDevice = vi.fn().mockImplementation(async () => {
			orden.push("registro");
			return "granted" as const;
		});

		const r = await runTestPush("SESION", ensureDevice);

		expect(r.kind).toBe("sent");
		expect(orden).toEqual(["registro", "test"]);
	});

	it("sin permiso del sistema: lo explica y no llama al backend", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const r = await runTestPush("SESION", async () => "denied");

		expect(r).toEqual({ kind: "error", message: TEST_PUSH_MESSAGES.denied });
		expect(startsCooldown(r)).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("si falla el registro del token igual prueba, por si ya estaba registrado", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(200, enviado)));

		const r = await runTestPush("SESION", async () => {
			throw new Error("sin red");
		});

		expect(r.kind).toBe("sent");
	});
});
