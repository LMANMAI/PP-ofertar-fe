import { create } from "zustand";
import type { TabKey } from "../components";

/** Estado de interfaz compartido: pestaña activa y aviso (toast) en pantalla. */
type UiState = {
	tab: TabKey;
	/** Nombre de la pantalla visible (lo mantiene el contenedor de navegación). */
	route: string | null;
	toastMessage: string | null;
	setTab: (tab: TabKey) => void;
	setRoute: (route: string | null) => void;
	showToast: (message: string) => void;
	dismissToast: () => void;
	reset: () => void;
};

export const useUiStore = create<UiState>()((set) => ({
	tab: "home",
	route: null,
	toastMessage: null,
	setTab: (tab) => set({ tab }),
	setRoute: (route) => set({ route }),
	showToast: (toastMessage) => set({ toastMessage }),
	dismissToast: () => set({ toastMessage: null }),
	// route no se toca: es de la navegación, no de la cuenta.
	reset: () => set({ tab: "home", toastMessage: null }),
}));
