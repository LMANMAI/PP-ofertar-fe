import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { AppState, Platform } from "react-native";
import { API_BASE_URL, TELEMETRY_ENABLED } from "../config";
import { useSessionStore, useUiStore } from "../store";
import { disableTelemetry, flush, initTelemetry, setAppActive, trackAppStart, trackError, trackScreen } from "./core";

/**
 * Engancha la telemetría (`core.ts`) con React Native: de dónde salen las pantallas, los
 * errores no capturados, el arranque y el paso a segundo plano. Se llama una vez, desde
 * `index.ts`, antes de montar la app.
 */

const INSTALL_ID_KEY = "ofertar.telemetry.installId";

/** Cuándo se cargó el JS: desde acá se mide el arranque. */
const jsStartedAt = Date.now();
let started = false;

type ErrorHandler = (error: unknown, isFatal?: boolean) => void;
type GlobalErrorUtils = { getGlobalHandler: () => ErrorHandler; setGlobalHandler: (handler: ErrorHandler) => void };

function randomId(): string {
	let id = "";
	for (let i = 0; i < 32; i++) id += Math.floor(Math.random() * 16).toString(16);
	return id;
}

/** Id aleatorio de la instalación: se genera una vez y no dice nada de la persona ni del teléfono. */
async function loadInstallId(): Promise<string> {
	try {
		const stored = await AsyncStorage.getItem(INSTALL_ID_KEY);
		if (stored) return stored;
		const created = randomId();
		await AsyncStorage.setItem(INSTALL_ID_KEY, created);
		return created;
	} catch {
		// Sin almacenamiento el id dura lo que dura la app abierta.
		return randomId();
	}
}

/** Inicio, Ofertas y Perfil comparten la ruta Main: la pestaña es lo que las distingue. */
function screenName(route: string | null, tab: string): string | null {
	if (!route) return null;
	return route === "Main" ? `Main.${tab}` : route;
}

function watchScreens(): void {
	const report = (state: { route: string | null; tab: string }) => trackScreen(screenName(state.route, state.tab));
	report(useUiStore.getState());
	useUiStore.subscribe(report);
}

function watchBoot(): void {
	const report = () => trackAppStart(Date.now() - jsStartedAt);
	if (useSessionStore.getState().booted) return report();
	const unsubscribe = useSessionStore.subscribe((state) => {
		if (!state.booted) return;
		unsubscribe();
		report();
	});
}

function watchErrors(): void {
	const errorUtils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
	if (errorUtils) {
		const previous = errorUtils.getGlobalHandler();
		errorUtils.setGlobalHandler((error, isFatal) => {
			trackError("js", error, Boolean(isFatal));
			previous(error, isFatal);
		});
	} else if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.addEventListener === "function") {
		window.addEventListener("error", (event) => trackError("js", event.error ?? event.message));
		window.addEventListener("unhandledrejection", (event) => trackError("promise", event.reason));
	}
}

function watchAppState(): void {
	AppState.addEventListener("change", (state) => {
		const active = state === "active";
		setAppActive(active);
		// Al salir de la app puede no haber otra oportunidad de mandar lo acumulado.
		if (!active) void flush();
	});
}

export function startTelemetry(): void {
	if (started) return;
	started = true;
	if (!TELEMETRY_ENABLED) {
		disableTelemetry();
		return;
	}
	watchErrors();
	watchScreens();
	watchBoot();
	watchAppState();
	void loadInstallId().then((installId) =>
		initTelemetry({
			endpoint: `${API_BASE_URL}/telemetry/events`,
			installId,
			platform: Platform.OS,
			appVersion: Constants.expoConfig?.version,
			osVersion: String(Platform.Version ?? ""),
		}),
	);
}
