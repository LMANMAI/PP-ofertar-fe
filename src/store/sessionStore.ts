import { create } from "zustand";
import type { Session } from "../auth/session";

/**
 * Sesión del usuario y flags de arranque/biometría. Es el único lugar donde vive el
 * token en memoria; el que se guarda en SecureStore para el desbloqueo biométrico se
 * maneja aparte (src/auth/biometricAuth.ts).
 */
type SessionState = {
	session: Session | null;
	/** El usuario activó el desbloqueo biométrico. */
	biometricEnabled: boolean;
	/** Hay biometría disponible y un token guardado: la bienvenida ofrece entrar con ella. */
	showBiometricOnWelcome: boolean;
	/** Ya se leyeron las preferencias guardadas; hasta entonces se muestra el spinner de arranque. */
	booted: boolean;
	setSession: (session: Session | null) => void;
	setBiometricEnabled: (enabled: boolean) => void;
	setShowBiometricOnWelcome: (show: boolean) => void;
	setBooted: (booted: boolean) => void;
	/** Cierra la sesión en memoria. No toca SecureStore ni los demás stores: ver resetAllStores(). */
	reset: () => void;
};

export const useSessionStore = create<SessionState>()((set) => ({
	session: null,
	biometricEnabled: false,
	showBiometricOnWelcome: false,
	booted: false,
	setSession: (session) => set({ session }),
	setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
	setShowBiometricOnWelcome: (showBiometricOnWelcome) => set({ showBiometricOnWelcome }),
	setBooted: (booted) => set({ booted }),
	// El arranque (booted, showBiometricOnWelcome) no depende de la cuenta y se conserva.
	reset: () => set({ session: null, biometricEnabled: false }),
}));
