import { create } from "zustand";
import type { TabKey, ToastKind } from "../components";

/** Estado de interfaz compartido: pestaña activa y aviso (toast) en pantalla. */
type UiState = {
	tab: TabKey;
	/** Nombre de la pantalla visible (lo mantiene el contenedor de navegación). */
	route: string | null;
	toastMessage: string | null;
	/** "error" para algo que no salió: el aviso no puede llevar el tilde verde de lo que sí. */
	toastKind: ToastKind;
	setTab: (tab: TabKey) => void;
	setRoute: (route: string | null) => void;
	showToast: (message: string, kind?: ToastKind) => void;
	dismissToast: () => void;
	reset: () => void;
};

export const useUiStore = create<UiState>()((set) => ({
	tab: "home",
	route: null,
	toastMessage: null,
	toastKind: "success",
	setTab: (tab) => set({ tab }),
	setRoute: (route) => set({ route }),
	showToast: (toastMessage, toastKind = "success") => set({ toastMessage, toastKind }),
	dismissToast: () => set({ toastMessage: null }),
	// route no se toca: es de la navegación, no de la cuenta.
	reset: () => set({ tab: "home", toastMessage: null, toastKind: "success" }),
}));
