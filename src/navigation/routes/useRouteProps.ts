import type { TabKey } from "../../components";
import { useSessionStore, useUiStore } from "../../store";
import { nav } from "../nav";

/** Las tres props que toda pantalla con barra inferior recibe. */
export function useTabProps(): { activeTab: TabKey; onSelectTab: (t: TabKey) => void; onScanPress: () => void } {
	const activeTab = useUiStore((s) => s.tab);
	return { activeTab, onSelectTab: nav.selectTab, onScanPress: nav.scanPress };
}

/** La sesión, o null: las pantallas con sesión no muestran nada si no hay (como antes de la navegación). */
export function useSession() {
	return useSessionStore((s) => s.session);
}
