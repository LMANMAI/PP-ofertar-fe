import { create } from "zustand";
import type { TicketResponse } from "../services/ticketApi";

export type PickedPdf = { name: string; uri: string; base64: string };

/** Qué se está subiendo, para el texto de la pantalla de carga. */
export type ProcessingFileType = "pdf" | "image";

/** Estado del flujo de escaneo de tickets y del ticket abierto. */
type ScanState = {
	selectedPdf: PickedPdf | null;
	/** El ticket que se está revisando (la única pasada editable sobre la salida del OCR). */
	scannedTicket: TicketResponse | null;
	ocrErrorMsg: string;
	processingOcr: boolean;
	processingFileType: ProcessingFileType | null;
	selectedTicketId: number | null;
	/**
	 * Tickets subidos en esta sesión que todavía no avisaron si faltó algo. Viven acá y no en el
	 * historial para que el aviso siga pendiente si el usuario se va a otra pantalla mientras el
	 * OCR corre en el servidor.
	 */
	awaitingTicketIds: number[];

	setSelectedPdf: (pdf: PickedPdf | null) => void;
	setScannedTicket: (ticket: TicketResponse | null) => void;
	setOcrError: (message: string) => void;
	setSelectedTicketId: (id: number | null) => void;
	/** Empieza a subir: muestra la pantalla de carga. */
	startProcessing: (fileType: ProcessingFileType) => void;
	finishProcessing: () => void;
	/** Un ticket se subió: queda esperando su aviso, el más nuevo primero. */
	addAwaiting: (ticketId: number) => void;
	/** El aviso de ese ticket ya se mostró. */
	announce: (ticketId: number) => void;
	/** Volver a intentar tras un error de escaneo. */
	resetForRetry: () => void;
	reset: () => void;
};

const vacio = {
	selectedPdf: null,
	scannedTicket: null,
	ocrErrorMsg: "",
	processingOcr: false,
	processingFileType: null,
	selectedTicketId: null,
	awaitingTicketIds: [] as number[],
};

export const useScanStore = create<ScanState>()((set) => ({
	...vacio,
	setSelectedPdf: (selectedPdf) => set({ selectedPdf }),
	setScannedTicket: (scannedTicket) => set({ scannedTicket }),
	setOcrError: (ocrErrorMsg) => set({ ocrErrorMsg }),
	setSelectedTicketId: (selectedTicketId) => set({ selectedTicketId }),
	startProcessing: (processingFileType) => set({ processingFileType, processingOcr: true }),
	finishProcessing: () => set({ processingOcr: false, processingFileType: null }),
	addAwaiting: (ticketId) => set((s) => ({ awaitingTicketIds: [ticketId, ...s.awaitingTicketIds] })),
	announce: (ticketId) => set((s) => ({ awaitingTicketIds: s.awaitingTicketIds.filter((id) => id !== ticketId) })),
	resetForRetry: () => set({ scannedTicket: null, ocrErrorMsg: "", selectedPdf: null, processingFileType: null }),
	reset: () => set(vacio),
}));
