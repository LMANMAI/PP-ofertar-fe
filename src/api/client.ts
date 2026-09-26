import type { ZodType } from "zod";
import { API_BASE_URL, CONTRACT_MODE } from "../config";

/** La respuesta llegó pero no cumple el contrato con el backend. */
export class ApiContractError extends Error {
	readonly endpoint: string;
	readonly issues: string;
	constructor(endpoint: string, issues: string) {
		super(`La respuesta de ${endpoint} no cumple el contrato: ${issues}`);
		this.name = "ApiContractError";
		this.endpoint = endpoint;
		this.issues = issues;
	}
}

/** El backend respondió con un estado de error, o la consulta superó el tiempo. */
export class ApiError extends Error {
	readonly kind: "http" | "timeout";
	readonly status: number | null;
	constructor(kind: "http" | "timeout", message: string, status: number | null = null) {
		super(message);
		this.name = "ApiError";
		this.kind = kind;
		this.status = status;
	}
}

/** Mensaje del backend (`{ message }`) o uno genérico con el estado. */
export async function parseApiError(res: Response): Promise<string> {
	try {
		const json = await res.json();
		if (json && typeof json.message === "string" && json.message) {
			return json.message;
		}
	} catch {
		// cuerpo vacío o no JSON
	}
	return `Error del servidor (${res.status})`;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export type RequestOptions<T> = {
	method?: "GET" | "POST" | "PUT" | "DELETE";
	token?: string;
	/** Cuerpo JSON. */
	json?: unknown;
	/** Cuerpo multipart (subida de archivos). */
	form?: FormData;
	query?: Query;
	/** Contrato de la respuesta. Sin esto la respuesta se devuelve sin validar. */
	schema?: ZodType<T>;
	/** Corta la consulta y lanza ApiError("timeout"). */
	timeoutMs?: number;
};

function buildUrl(path: string, query?: Query): string {
	if (!query) return `${API_BASE_URL}${path}`;
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== null && value !== "") params.append(key, String(value));
	}
	const qs = params.toString();
	return `${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;
}

async function send(path: string, opts: RequestOptions<unknown>): Promise<Response> {
	const headers: Record<string, string> = { Accept: "application/json" };
	if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
	let body: BodyInit | undefined;
	if (opts.form) {
		// Sin Content-Type: el runtime agrega el boundary del multipart.
		body = opts.form;
	} else if (opts.json !== undefined) {
		headers["Content-Type"] = "application/json";
		body = JSON.stringify(opts.json);
	}

	const controller = opts.timeoutMs ? new AbortController() : null;
	const timer = controller ? setTimeout(() => controller.abort(), opts.timeoutMs) : null;
	let res: Response;
	try {
		res = await fetch(buildUrl(path, opts.query), {
			method: opts.method ?? "GET",
			headers,
			body,
			signal: controller?.signal,
		});
	} catch (err) {
		if (controller?.signal.aborted) throw new ApiError("timeout", "La consulta tardó demasiado.");
		throw err; // sin conexión: el TypeError original, que friendlyAuthError sabe traducir
	} finally {
		if (timer) clearTimeout(timer);
	}

	if (!res.ok) throw new ApiError("http", await parseApiError(res), res.status);
	return res;
}

/** Valida `data` contra el contrato según CONTRACT_MODE. Exportada para probarla sin red. */
export function validate<T>(endpoint: string, data: unknown, schema: ZodType<T>, mode = CONTRACT_MODE): T {
	const parsed = schema.safeParse(data);
	if (parsed.success) return parsed.data;
	const issues = parsed.error.issues
		.slice(0, 5)
		.map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
		.join("; ");
	if (mode === "strict") throw new ApiContractError(endpoint, issues);
	console.warn(`[contrato] ${endpoint}: ${issues}`);
	return data as T;
}

/** Llamada con respuesta JSON, validada contra `opts.schema` si se da. */
export async function request<T>(path: string, opts: RequestOptions<T> = {}): Promise<T> {
	const res = await send(path, opts);
	const data = await res.json();
	return opts.schema ? validate(`${opts.method ?? "GET"} ${path}`, data, opts.schema) : (data as T);
}

/** Llamada sin cuerpo de respuesta (204). */
export async function requestVoid(path: string, opts: RequestOptions<never> = {}): Promise<void> {
	await send(path, opts);
}
