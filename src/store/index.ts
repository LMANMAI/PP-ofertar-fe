import { useAuthFlowStore } from "./authFlowStore";
import { useBankPromosStore } from "./bankPromosStore";
import { useFollowedProductsStore } from "./followedProductsStore";
import { useHabitualProductsStore } from "./habitualProductsStore";
import { useOffersStore } from "./offersStore";
import { usePointsStore } from "./pointsStore";
import { useScanStore } from "./scanStore";
import { useSessionStore } from "./sessionStore";
import { useUiStore } from "./uiStore";

export { useAuthFlowStore } from "./authFlowStore";
export { DuplicateMethodError, useBankPromosStore } from "./bankPromosStore";
export { isFollowing, useFollowedProductsStore } from "./followedProductsStore";
export { isInHabitual, useHabitualProductsStore } from "./habitualProductsStore";
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
	useFollowedProductsStore.getState().reset();
	useHabitualProductsStore.getState().reset();
	useUiStore.getState().reset();
	useAuthFlowStore.getState().reset();
	useBankPromosStore.getState().reset();
}
