import { create } from "zustand";
import type { TabKey } from "../components";

/** Estado de interfaz compartido: pestaña activa y aviso (toast) en pantalla. */
type UiState = {
	tab: TabKey;
	toastMessage: string | null;
	setTab: (tab: TabKey) => void;
	showToast: (message: string) => void;
	dismissToast: () => void;
	reset: () => void;
};

export const useUiStore = create<UiState>()((set) => ({
	tab: "home",
	toastMessage: null,
	setTab: (tab) => set({ tab }),
	showToast: (toastMessage) => set({ toastMessage }),
	dismissToast: () => set({ toastMessage: null }),
	reset: () => set({ tab: "home", toastMessage: null }),
}));
