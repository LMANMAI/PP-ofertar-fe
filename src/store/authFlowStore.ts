import { create } from "zustand";

export type RegisterData = { firstName: string; lastName: string; email: string; referralCode: string };

/**
 * Datos que viajan entre los pasos del registro y de la recuperación de contraseña. Son
 * transitorios y tienen que sobrevivir a ir y volver entre pantallas (al volver al paso 1 los
 * campos siguen completos), por eso no son parámetros de ruta.
 */
type AuthFlowState = {
	registerData: RegisterData | null;
	/** El correo al que se mandó el código de recuperación. */
	recoveryEmail: string;
	/** El código, una vez verificado. */
	recoveryCode: string;
	setRegisterData: (data: RegisterData | null) => void;
	setRecovery: (patch: { email?: string; code?: string }) => void;
	reset: () => void;
};

const vacio = { registerData: null, recoveryEmail: "", recoveryCode: "" };

export const useAuthFlowStore = create<AuthFlowState>()((set) => ({
	...vacio,
	setRegisterData: (registerData) => set({ registerData }),
	setRecovery: ({ email, code }) =>
		set((s) => ({
			recoveryEmail: email ?? s.recoveryEmail,
			recoveryCode: code ?? s.recoveryCode,
		})),
	reset: () => set(vacio),
}));
