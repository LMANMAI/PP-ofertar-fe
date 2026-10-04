import { useEffect } from "react";
import { nav } from "../navigation/nav";
import { useSessionStore } from "../store";
import { canUsePush, loadNotifications } from "../notifications/loadNotifications";

/**
 * Qué pasa al tocar una notificación push: el backend manda en `data.screen` a dónde ir.
 * Sin sesión no se navega (las pantallas de la cuenta no tendrían nada que mostrar).
 *
 * `expo-notifications` no se puede importar en Expo Go (Android): evaluar el
 * módulo lanza un error, así que se carga de forma perezosa y solo fuera de
 * Expo Go (ver `notifications/loadNotifications`).
 */
export function useNotificationTaps(): void {
	useEffect(() => {
		if (!canUsePush()) return;

		let cancelled = false;
		let sub: { remove: () => void } | undefined;

		loadNotifications()
			.then((Notifications) => {
				if (!Notifications || cancelled) return;

				Notifications.setNotificationHandler({
					handleNotification: async () => ({
						shouldShowBanner: true,
						shouldShowList: true,
						shouldPlaySound: true,
						shouldSetBadge: false,
					}),
				});

				sub = Notifications.addNotificationResponseReceivedListener((response) => {
					if (!useSessionStore.getState().session) return;
					const data = response.notification.request.content.data as { screen?: string; ticketId?: string };
					if (data.screen === "ticketDetail" && data.ticketId) {
						nav.push("TicketDetail", { ticketId: Number(data.ticketId) });
						return;
					}
					if (data.screen === "pointsHistory") {
						nav.push("PointsHistory");
						return;
					}
					if (data.screen === "ticketHistory") {
						nav.selectTab("history");
						return;
					}
					if (data.screen === "scanMethod") {
						nav.selectTab("scan");
						return;
					}
					if (data.screen === "offers") {
						nav.goMain("offers");
						return;
					}
					nav.goMain("home");
				});
			})
			.catch(() => {});

		return () => {
			cancelled = true;
			sub?.remove();
		};
	}, []);
}
