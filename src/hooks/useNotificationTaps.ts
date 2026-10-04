import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { nav } from "../navigation/nav";
import { useSessionStore } from "../store";

/**
 * Qué pasa al tocar una notificación push: el backend manda en `data.screen` a dónde ir.
 * Sin sesión no se navega (las pantallas de la cuenta no tendrían nada que mostrar).
 */
export function useNotificationTaps(): void {
	useEffect(() => {
		Notifications.setNotificationHandler({
			handleNotification: async () => ({
				shouldShowBanner: true,
				shouldShowList: true,
				shouldPlaySound: true,
				shouldSetBadge: false,
			}),
		});

		const sub = Notifications.addNotificationResponseReceivedListener((response) => {
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
		return () => sub.remove();
	}, []);
}
