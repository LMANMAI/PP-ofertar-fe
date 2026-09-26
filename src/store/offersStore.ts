import { create } from "zustand";
import { getOffers, resolveOffer, type Offer } from "../services/offersApi";

/**
 * Las ofertas del feed viven acá y no en cada pantalla porque el detalle se resuelve por id: la
 * pantalla que abre una oferta (Inicio pide 8, Ofertas pide de a 50 con filtros, Productos
 * recurrentes trae las suyas) no es la que la muestra.
 */
type OffersState = {
	offers: Offer[];
	/** Una oferta abierta desde un lugar que no es el feed: el feed está paginado y filtrado por
	 * cadenas favoritas, así que la promoción que matcheó un producto muchas veces no está en él. */
	fallbackOffer: Offer | null;
	selectedOfferId: string | null;
	/** Token para el que se pidió el feed; descarta respuestas de una sesión anterior. */
	loadedFor: string | null;
	load: (token: string) => Promise<void>;
	open: (id: string, fallback?: Offer | null) => void;
	/** La oferta a mostrar en el detalle para `id` (ver resolveOffer). */
	find: (id: string | null) => Offer | null;
	reset: () => void;
};

export const useOffersStore = create<OffersState>()((set, get) => ({
	offers: [],
	fallbackOffer: null,
	selectedOfferId: null,
	loadedFor: null,

	load: async (token) => {
		set({ loadedFor: token });
		let items: Offer[] = [];
		try {
			items = (await getOffers(token, 1, 50)).items;
		} catch {
			items = [];
		}
		// Si mientras tanto se cerró la sesión o entró otra cuenta, esta respuesta ya no corresponde.
		if (get().loadedFor === token) set({ offers: items });
	},

	open: (id, fallback) => set({ selectedOfferId: id, fallbackOffer: fallback ?? null }),

	find: (id) => resolveOffer(get().offers, id, get().fallbackOffer),

	reset: () => set({ offers: [], fallbackOffer: null, selectedOfferId: null, loadedFor: null }),
}));
