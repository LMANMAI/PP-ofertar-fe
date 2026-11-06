import { create } from "zustand";
import {
	deletePaymentMethod,
	getMyPaymentMethods,
	getPaymentCatalog,
	savePaymentMethods,
	type MyPaymentMethods,
	type PaymentCatalog,
	type PaymentMethodInput,
} from "../services/bankPromosApi";
import { sameMethod, toInput } from "../utils/bankPromos";

/**
 * Mis tarjetas: las que cargó el usuario, sus beneficios y el catálogo para elegirlas.
 *
 * Viven acá y no en la pantalla porque el calendario y la tira de Inicio dependen de ellas:
 * `revision` sube con cada cambio confirmado por el backend, y quien muestra promos la usa para
 * volver a pedirlas. Nunca hay números de tarjeta: sólo emisor, red y tipo.
 */
type BankPromosState = {
	catalog: PaymentCatalog | null;
	/** null hasta que se pudo leer. */
	mine: MyPaymentMethods | null;
	/** Token para el que se pidieron los datos; descarta respuestas de una sesión anterior. */
	loadedFor: string | null;
	/** Sube cada vez que cambian las tarjetas o los beneficios. */
	revision: number;

	/** Trae el catálogo (si falta) y las tarjetas del usuario. Lanza el error si falla. */
	load: (token: string) => Promise<void>;
	/** Lanzan el error del backend; el estado cambia recién cuando el backend confirma. */
	addMethod: (token: string, method: PaymentMethodInput) => Promise<void>;
	removeMethod: (token: string, id: number) => Promise<void>;
	setBenefit: (token: string, benefit: string, enabled: boolean) => Promise<void>;

	reset: () => void;
};

const vacio = {
	catalog: null as PaymentCatalog | null,
	mine: null as MyPaymentMethods | null,
	loadedFor: null as string | null,
	revision: 0,
};

/** Ya tenés esa tarjeta: el backend la rechazaría por la clave única, así que ni se manda. */
export class DuplicateMethodError extends Error {
	constructor() {
		super("Esa tarjeta ya está en tu lista.");
		this.name = "DuplicateMethodError";
	}
}

export const useBankPromosStore = create<BankPromosState>()((set, get) => {
	function bind(token: string) {
		if (get().loadedFor !== token) set({ ...vacio, loadedFor: token });
	}

	/** Las tarjetas actuales; si todavía no se leyeron, se leen antes de reemplazarlas con un PUT. */
	async function current(token: string): Promise<MyPaymentMethods> {
		const mine = get().mine;
		if (mine) return mine;
		const read = await getMyPaymentMethods(token);
		if (get().loadedFor === token) set({ mine: read });
		return read;
	}

	function applied(token: string, mine: MyPaymentMethods) {
		if (get().loadedFor !== token) return;
		set((s) => ({ mine, revision: s.revision + 1 }));
	}

	return {
		...vacio,

		load: async (token) => {
			bind(token);
			const [catalog, mine] = await Promise.all([
				get().catalog ? Promise.resolve(get().catalog as PaymentCatalog) : getPaymentCatalog(token),
				getMyPaymentMethods(token),
			]);
			if (get().loadedFor === token) set({ catalog, mine });
		},

		addMethod: async (token, method) => {
			bind(token);
			const mine = await current(token);
			const inputs = mine.methods.map(toInput);
			if (inputs.some((m) => sameMethod(m, method))) throw new DuplicateMethodError();
			// El PUT reemplaza el conjunto entero: van las que ya estaban más la nueva.
			const saved = await savePaymentMethods(token, { methods: [...inputs, method], benefits: mine.benefits });
			applied(token, saved);
		},

		removeMethod: async (token, id) => {
			bind(token);
			await deletePaymentMethod(token, id);
			const mine = get().mine;
			if (mine) applied(token, { ...mine, methods: mine.methods.filter((m) => m.id !== id) });
			else applied(token, await getMyPaymentMethods(token));
		},

		setBenefit: async (token, benefit, enabled) => {
			bind(token);
			const mine = await current(token);
			const benefits = enabled ? [...new Set([...mine.benefits, benefit])] : mine.benefits.filter((b) => b !== benefit);
			const saved = await savePaymentMethods(token, { methods: mine.methods.map(toInput), benefits });
			applied(token, saved);
		},

		reset: () => set(vacio),
	};
});
