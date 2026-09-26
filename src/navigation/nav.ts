import { CommonActions, StackActions, createNavigationContainerRef } from "@react-navigation/native";
import type { TabKey } from "../components";
import { useUiStore } from "../store";
import type { RootStackParamList, RouteName } from "./types";

/**
 * Referencia al contenedor de navegación, para navegar desde donde no hay un componente (los
 * botones de la barra inferior, la subida de tickets, el toque en una notificación).
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type Route = { [K in RouteName]: undefined extends RootStackParamList[K] ? { name: K } : { name: K; params: RootStackParamList[K] } }[RouteName];

function enPila(name: RouteName): boolean {
	return navigationRef.getRootState()?.routes.some((r) => r.name === name) ?? false;
}

function rutaActual(): RouteName | undefined {
	return navigationRef.isReady() ? (navigationRef.getCurrentRoute()?.name as RouteName | undefined) : undefined;
}

/**
 * Cómo se mueve la app entre pantallas. Cada verbo tiene un significado fijo:
 *  - `push`: ir a una pantalla de detalle o al siguiente paso; "atrás" vuelve a la actual.
 *  - `replace`: cambio lateral (login ↔ registro): no deja la anterior en el historial.
 *  - `backTo`: volver a una pantalla que ya está en la pila (o ir a ella si no).
 *  - `resetTo`: empezar de nuevo desde ahí (cerrar sesión, terminar un flujo).
 */
export const nav = {
	push<K extends RouteName>(...args: undefined extends RootStackParamList[K] ? [name: K] : [name: K, params: RootStackParamList[K]]) {
		if (!navigationRef.isReady()) return;
		const [name, params] = args;
		navigationRef.dispatch(StackActions.push(name, params));
	},

	replace<K extends RouteName>(...args: undefined extends RootStackParamList[K] ? [name: K] : [name: K, params: RootStackParamList[K]]) {
		if (!navigationRef.isReady()) return;
		const [name, params] = args;
		navigationRef.dispatch(StackActions.replace(name, params));
	},

	/** Vuelve a `name` si está en la pila (cerrando lo que hay encima); si no, navega a ella. */
	backTo<K extends RouteName>(...args: undefined extends RootStackParamList[K] ? [name: K] : [name: K, params: RootStackParamList[K]]) {
		if (!navigationRef.isReady()) return;
		const [name, params] = args;
		navigationRef.dispatch(enPila(name) ? StackActions.popTo(name, params) : StackActions.push(name, params));
	},

	goBack() {
		if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
	},

	/** Deja la pila con exactamente estas pantallas; la última queda visible. */
	resetTo(...routes: Route[]) {
		if (!navigationRef.isReady() || routes.length === 0) return;
		navigationRef.dispatch(
			CommonActions.reset({
				index: routes.length - 1,
				routes: routes.map((r) => ({ name: r.name, params: "params" in r ? r.params : undefined })),
			}),
		);
	},

	/** A la pestaña de Inicio, Ofertas o Perfil (todas viven en la pantalla Main). */
	goMain(tab: "home" | "offers" | "profile" = "home") {
		useUiStore.getState().setTab(tab);
		if (rutaActual() === "Main") return; // dentro de Main cambiar de pestaña es instantáneo
		if (enPila("Main")) nav.backTo("Main");
		else nav.resetTo({ name: "Main" });
	},

	/** Toque en la barra inferior. */
	selectTab(tab: TabKey) {
		useUiStore.getState().setTab(tab);
		if (tab === "history") {
			if (rutaActual() !== "TicketHistory") nav.resetTo({ name: "Main" }, { name: "TicketHistory" });
			return;
		}
		if (tab === "scan") {
			if (rutaActual() !== "CaptureTicket") nav.resetTo({ name: "Main" }, { name: "CaptureTicket" });
			return;
		}
		nav.goMain(tab);
	},

	/** Botón central de escaneo. */
	scanPress() {
		nav.selectTab("scan");
	},
};
