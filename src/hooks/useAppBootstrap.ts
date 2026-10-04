import { useEffect } from "react";
import { getBiometricPreference, getStoredToken, isBiometricAvailable } from "../auth/biometricAuth";
import { registerForPushNotifications } from "../notifications/pushRegistration";
import { useOffersStore, usePointsStore, useSessionStore } from "../store";

/**
 * Efectos de arranque y de sesión de la app, que antes vivían sueltos en App.tsx.
 *
 *  - Al abrir: lee las preferencias de biometría guardadas y marca la app como iniciada.
 *  - Cuando hay sesión: carga las ofertas y los puntos y reengancha el token de push.
 *  - Cuando no la hay: vacía lo que dependía de la cuenta.
 */
export function useAppBootstrap(): void {
	const session = useSessionStore((s) => s.session);

	useEffect(() => {
		const { setBiometricEnabled, setShowBiometricOnWelcome, setBooted } = useSessionStore.getState();
		(async () => {
			try {
				const [pref, available, token] = await Promise.all([
					getBiometricPreference(),
					isBiometricAvailable(),
					getStoredToken(),
				]);
				if (pref) setBiometricEnabled(true);
				if (available && token) setShowBiometricOnWelcome(true);
			} catch {
				// SecureStore puede fallar en algunos entornos
			} finally {
				setBooted(true);
			}
		})();
	}, []);

	useEffect(() => {
		if (!session) {
			useOffersStore.getState().reset();
			usePointsStore.getState().reset();
			return;
		}
		// El detalle de una oferta se resuelve por id, así que la lista vive arriba de las pantallas.
		void useOffersStore.getState().load(session.token);
		// El saldo y el historial vienen del backend: se traen apenas hay sesión y de nuevo tras cada canje.
		void usePointsStore.getState().refresh(session.token);
		// Registro silencioso: si el usuario ya había dado permiso en una sesión anterior, reengancha el
		// token al volver a abrir la app (puede haber cambiado, p. ej. tras una reinstalación). Nunca pide
		// permiso desde acá: eso solo pasa cuando prende el switch en Perfil.
		registerForPushNotifications(session.token, { requestPermission: false }).catch(() => {});
	}, [session]);
}
