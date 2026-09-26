import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiContractError, ApiError, parseApiError, request, requestVoid, validate } from "../client";

const schema = z.object({ id: z.number(), name: z.string() });

function respuesta(status: number, cuerpo?: unknown): Response {
	return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

afterEach(() => vi.unstubAllGlobals());

describe("validate", () => {
	it("devuelve los datos si cumplen", () => {
		expect(validate("GET /x", { id: 1, name: "a" }, schema, "strict")).toEqual({ id: 1, name: "a" });
	});

	it("modo strict: lanza ApiContractError con el endpoint y el campo", () => {
		try {
			validate("GET /x", { id: "1", name: "a" }, schema, "strict");
			expect.unreachable();
		} catch (e) {
			expect(e).toBeInstanceOf(ApiContractError);
			expect((e as ApiContractError).endpoint).toBe("GET /x");
			expect((e as ApiContractError).issues).toContain("id");
		}
	});

	it("modo report: deja constancia y devuelve los datos tal cual llegaron", () => {
		const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
		const crudo = { id: "1", name: "a" };
		expect(validate("GET /x", crudo, schema, "report")).toBe(crudo);
		expect(aviso).toHaveBeenCalledOnce();
		aviso.mockRestore();
	});
});

describe("request", () => {
	it("arma la URL, el token y la query, y omite los valores vacíos", async () => {
		const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { id: 1, name: "a" }));
		vi.stubGlobal("fetch", fetchMock);
		await request("/things", { token: "T", query: { a: 1, b: undefined, c: "", d: 0, e: false }, schema });
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toMatch(/\/things\?a=1&d=0&e=false$/);
		expect(init.headers.Authorization).toBe("Bearer T");
		expect(init.method).toBe("GET");
	});

	it("manda JSON con su Content-Type", async () => {
		const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { id: 1, name: "a" }));
		vi.stubGlobal("fetch", fetchMock);
		await request("/things", { method: "POST", json: { x: 1 }, schema });
		const init = fetchMock.mock.calls[0][1];
		expect(init.headers["Content-Type"]).toBe("application/json");
		expect(init.body).toBe('{"x":1}');
	});

	it("con multipart no fija el Content-Type (lo pone el runtime con el boundary)", async () => {
		const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { id: 1, name: "a" }));
		vi.stubGlobal("fetch", fetchMock);
		await request("/upload", { method: "POST", form: new FormData(), schema });
		expect(fetchMock.mock.calls[0][1].headers["Content-Type"]).toBeUndefined();
	});

	it("un estado de error se vuelve ApiError con el mensaje del backend", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(409, { status: 409, message: "No te alcanzan los puntos" })));
		await expect(request("/points/redeem", { method: "POST" })).rejects.toMatchObject({
			name: "ApiError",
			kind: "http",
			status: 409,
			message: "No te alcanzan los puntos",
		});
	});

	it("sin mensaje del backend usa uno genérico con el estado", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 502 })));
		await expect(request("/x")).rejects.toThrow("Error del servidor (502)");
	});

	it("sin conexión deja pasar el error original de fetch", async () => {
		const sinRed = new TypeError("Network request failed");
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(sinRed));
		await expect(request("/x")).rejects.toBe(sinRed);
	});

	it("supera el tiempo máximo: ApiError de tipo timeout", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockImplementation(
				(_url: string, init: RequestInit) =>
					new Promise((_ok, fallo) =>
						init.signal?.addEventListener("abort", () => fallo(new DOMException("abort", "AbortError"))),
					),
			),
		);
		const error = (await request("/lento", { timeoutMs: 10 }).catch((e) => e)) as ApiError;
		expect(error).toBeInstanceOf(ApiError);
		expect(error.kind).toBe("timeout");
	});

	it("requestVoid acepta 204 sin cuerpo", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
		await expect(requestVoid("/auth/forgot-password", { method: "POST" })).resolves.toBeUndefined();
	});
});

describe("parseApiError", () => {
	it("lee el mensaje del cuerpo", async () => {
		expect(await parseApiError(respuesta(400, { message: "Email inválido" }))).toBe("Email inválido");
	});
});
