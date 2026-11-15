/**
 * Telemetría anónima de la app: qué pantallas se ven, cuánto tardan los pedidos al backend
 * vistos desde el teléfono, errores no capturados y tiempo de arranque. Se junta en memoria y
 * se manda en lotes a POST /telemetry/events; el backend la guarda como métricas `app.*` que
 * muestra el tablero (PP-ofertar-dashboard).
 *
 * No viaja nada que identifique a la persona: ni usuario, ni email, ni token; solo un id
 * aleatorio de la instalación para contar dispositivos activos.
 *
 * Este archivo no importa módulos nativos (lo usa `src/api/client.ts`, que se prueba con vitest
 * en Node). El enganche con React Native está en `setup.ts`. Hasta que `initTelemetry` no corre,
 * los eventos solo se acumulan (con tope); si la telemetría está apagada, se descartan.
 */

export type ApiOutcome = "ok" | "http_4xx" | "http_5xx" | "timeout" | "network";

export type ErrorKind = "js" | "promise" | "contract";

export type TelemetryEvent = {
	type: "session_start" | "app_start" | "screen_view" | "screen_time" | "api_request" | "error" | "event";
	/** Pantalla, endpoint ("GET /offers/{id}"), tipo de error o nombre del evento, según `type`. */
	name?: string;
	durationMs?: number;
	outcome?: ApiOutcome;
	message?: string;
	stack?: string;
	screen?: string;
	fatal?: boolean;
};

export type TelemetryConfig = {
	/** URL completa de POST /telemetry/events. */
	endpoint: string;
	installId: string;
	platform: string;
	appVersion?: string;
	osVersion?: string;
	flushIntervalMs?: number;
	/** Cómo se manda un lote; se reemplaza en los tests. */
	transport?: (url: string, body: string) => Promise<void>;
};

const MAX_QUEUE = 200;
const MAX_BATCH = 50;
/** Un error en bucle no puede llenar la cola ni la tabla del backend. */
const MAX_ERRORS_PER_SESSION = 20;
const DEFAULT_FLUSH_MS = 30_000;
const MAX_BACKOFF_MS = 5 * 60_000;

let config: TelemetryConfig | null = null;
let disabled = false;
let queue: TelemetryEvent[] = [];
let sending = false;
let failures = 0;
let nextAttemptAt = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let currentScreen: string | null = null;
let screenSince = 0;
let errorsReported = 0;

async function defaultTransport(url: string, body: string): Promise<void> {
	const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
	if (!res.ok) throw new Error(`telemetry ${res.status}`);
}

function stopTimer(): void {
	if (timer) clearInterval(timer);
	timer = null;
}

/** Empieza a mandar: a partir de acá la cola se vacía cada `flushIntervalMs`. */
export function initTelemetry(next: TelemetryConfig): void {
	if (disabled) return;
	config = next;
	stopTimer();
	timer = setInterval(() => void flush(), next.flushIntervalMs ?? DEFAULT_FLUSH_MS);
	track({ type: "session_start" });
}

/** Apaga la telemetría: descarta lo acumulado y no acepta más eventos. */
export function disableTelemetry(): void {
	disabled = true;
	config = null;
	queue = [];
	stopTimer();
}

/** Vuelve al estado inicial (para los tests). */
export function resetTelemetry(): void {
	stopTimer();
	config = null;
	disabled = false;
	queue = [];
	sending = false;
	failures = 0;
	nextAttemptAt = 0;
	currentScreen = null;
	screenSince = 0;
	errorsReported = 0;
}

/** Eventos esperando a ser enviados (para los tests). */
export function pendingEvents(): readonly TelemetryEvent[] {
	return queue;
}

export function track(event: TelemetryEvent): void {
	if (disabled) return;
	queue.push(event);
	// Sin conexión por mucho tiempo se pierde lo más viejo, no lo más nuevo.
	if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
	if (config && queue.length >= MAX_BATCH) void flush();
}

/** Pantalla a la vista. Repetir la misma no cuenta; al cambiar se informa cuánto duró la anterior. */
export function trackScreen(name: string | null): void {
	if (!name || name === currentScreen) return;
	const now = Date.now();
	if (currentScreen && screenSince) track({ type: "screen_time", name: currentScreen, durationMs: now - screenSince });
	currentScreen = name;
	screenSince = now;
	track({ type: "screen_view", name });
}

/** La app pasó a segundo plano o volvió: el tiempo en pantalla no corre mientras no se la ve. */
export function setAppActive(active: boolean): void {
	const now = Date.now();
	if (!active && currentScreen && screenSince) {
		track({ type: "screen_time", name: currentScreen, durationMs: now - screenSince });
		screenSince = 0;
	} else if (active && currentScreen && !screenSince) {
		screenSince = now;
	}
}

function isVariableSegment(segment: string): boolean {
	return /^\d+$/.test(segment) || segment.length > 32 || /[^A-Za-z0-9_.-]/.test(segment) || /^[0-9a-f-]{16,}$/i.test(segment);
}

/** "/sepa/productos/7790001000019?x=1" → "/sepa/productos/{id}": una serie por endpoint, no por recurso. */
export function normalizePath(path: string): string {
	const clean = path.split("?")[0].split("#")[0];
	return clean
		.split("/")
		.map((segment) => (segment && isVariableSegment(segment) ? "{id}" : segment))
		.join("/");
}

export function outcomeOfStatus(status: number): ApiOutcome {
	if (status >= 500) return "http_5xx";
	if (status >= 400) return "http_4xx";
	return "ok";
}

export function trackApiRequest(method: string, path: string, outcome: ApiOutcome, durationMs: number): void {
	if (path.startsWith("/telemetry")) return;
	track({ type: "api_request", name: `${method} ${normalizePath(path)}`, outcome, durationMs: Math.round(durationMs) });
}

export function trackError(kind: ErrorKind, error: unknown, fatal = false): void {
	if (disabled || errorsReported >= MAX_ERRORS_PER_SESSION) return;
	errorsReported++;
	const isError = error instanceof Error;
	const message = isError ? `${error.name}: ${error.message}` : String(error);
	track({
		type: "error",
		name: kind,
		message: message.slice(0, 300),
		stack: isError && error.stack ? error.stack.slice(0, 2000) : undefined,
		screen: currentScreen ?? undefined,
		fatal,
	});
	// Un error fatal cierra la app: se intenta mandar ya.
	if (fatal) void flush();
}

/** Tiempo desde que cargó el JS hasta que la app quedó lista para usarse. */
export function trackAppStart(durationMs: number): void {
	track({ type: "app_start", durationMs: Math.round(durationMs) });
}

/** Un hecho de negocio contado por nombre (letras, números, "_", "." y "-"), p. ej. "ticket_upload_ok". */
export function trackEvent(name: string): void {
	track({ type: "event", name });
}

/** Manda hasta un lote. Si falla, los eventos vuelven a la cola y se espera cada vez más para reintentar. */
export async function flush(): Promise<void> {
	const current = config;
	if (!current || sending || queue.length === 0 || Date.now() < nextAttemptAt) return;
	const batch = queue.splice(0, MAX_BATCH);
	sending = true;
	try {
		await (current.transport ?? defaultTransport)(
			current.endpoint,
			JSON.stringify({
				installId: current.installId,
				platform: current.platform,
				appVersion: current.appVersion,
				osVersion: current.osVersion,
				events: batch,
			}),
		);
		failures = 0;
	} catch {
		// Sin conexión o backend caído: la telemetría nunca molesta al usuario ni rompe nada.
		failures++;
		nextAttemptAt = Date.now() + Math.min(MAX_BACKOFF_MS, DEFAULT_FLUSH_MS * 2 ** (failures - 1));
		if (!disabled) queue = batch.concat(queue).slice(-MAX_QUEUE);
	} finally {
		sending = false;
	}
}
