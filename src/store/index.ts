import { useOffersStore } from "./offersStore";
import { usePointsStore } from "./pointsStore";
import { useScanStore } from "./scanStore";
import { useSessionStore } from "./sessionStore";
import { useUiStore } from "./uiStore";

export { useOffersStore } from "./offersStore";
export { historyEntryFromTx, usePointsStore } from "./pointsStore";
export { useScanStore } from "./scanStore";
export { useSessionStore } from "./sessionStore";
export { useUiStore } from "./uiStore";

/**
 * Deja todo el estado de la cuenta como recién abierta la app. Cerrar sesión llama a esto en un
 * solo lugar: antes cada estado se reseteaba a mano y varios (el ticket en revisión, el PDF
 * elegido) quedaban con datos de la cuenta anterior para la siguiente que entrara en el equipo.
 */
export function resetAllStores(): void {
	useSessionStore.getState().reset();
	usePointsStore.getState().reset();
	useOffersStore.getState().reset();
	useScanStore.getState().reset();
	useUiStore.getState().reset();
}
