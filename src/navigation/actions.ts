import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { clearStoredToken, getBiometricPreference, getPromptDismissed, isBiometricAvailable } from "../auth/biometricAuth";
import { getTicket, scanTicket } from "../services";
import type { Offer, TicketResponse } from "../services";
import { resetAllStores, useOffersStore, useScanStore, useSessionStore } from "../store";
import { nav } from "./nav";

/**
 * Acciones de la app que combinan navegación con estado o con llamadas al backend y que usan
 * varias pantallas. Antes eran funciones sueltas dentro de App.tsx.
 */

/** Después del login: ofrece activar la biometría si corresponde y, si no, entra a Inicio. */
export async function handlePostLogin(): Promise<void> {
	try {
		if (!(await isBiometricAvailable())) return nav.goMain("home");
		if (await getBiometricPreference()) return nav.goMain("home");
		if (await getPromptDismissed()) return nav.goMain("home");
		nav.replace("BiometricPrompt");
	} catch {
		nav.goMain("home");
	}
}

export function handleLogout(): void {
	resetAllStores();
	clearStoredToken();
	nav.resetTo({ name: "Welcome" });
}

/**
 * La oferta entera viaja junto con el id: el feed está paginado y filtrado por las cadenas
 * favoritas, así que la promoción que matcheó un producto muchas veces no está en él.
 */
export function openOffer(id: string, fallback?: Offer | null): void {
	useOffersStore.getState().open(id, fallback);
	nav.push("OfferDetail", { offerId: id });
}

/**
 * Un ticket escaneado con la app cerrada termina de procesarse sin que el usuario pase por
 * TicketProcessedScreen, así que la única pasada editable sobre la salida del OCR tiene que
 * poder alcanzarse también desde el historial. Los ya revisados son de solo lectura.
 */
export async function handleSelectTicket(t: TicketResponse): Promise<void> {
	const session = useSessionStore.getState().session;
	if (t.status !== "PROCESSED" || t.reviewed || !session) {
		nav.push("TicketDetail", { ticketId: t.id });
		return;
	}
	try {
		const full = await getTicket(session.token, t.id);
		useScanStore.getState().setScannedTicket(full);
		nav.push("TicketProcessed");
	} catch {
		// Showing it read-only beats showing nothing.
		nav.push("TicketDetail", { ticketId: t.id });
	}
}

export async function handleChoosePdf(): Promise<void> {
	const scan = useScanStore.getState();
	try {
		const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
		if (result.canceled || !result.assets || result.assets.length === 0) return;

		const asset = result.assets[0];
		const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" as const });
		scan.setSelectedPdf({ name: asset.name ?? "ticket.pdf", uri: asset.uri, base64 });
		nav.push("PdfConfirm");
	} catch (error) {
		scan.setOcrError(error instanceof Error ? error.message : "No se pudo leer el PDF");
		nav.push("ScanError");
	}
}

export async function handleSendPhotos(photos: { id: string; uri: string; base64?: string }[]): Promise<void> {
	const session = useSessionStore.getState().session;
	if (photos.length === 0 || !session) return;
	const scan = useScanStore.getState();
	scan.startProcessing("image");
	try {
		// The upload returns as soon as the images are stored; the OCR runs
		// on the server, so the user is free to navigate (and it finishes
		// even if they lose connection or close the app).
		const uploaded = await scanTicket(session.token, photos);
		scan.addAwaiting(uploaded.id);
		nav.selectTab("history");
	} catch (error) {
		scan.setOcrError(error instanceof Error ? error.message : "Error al subir el ticket");
		nav.push("ScanError");
	} finally {
		scan.finishProcessing();
	}
}

export async function handleSendPdf(): Promise<void> {
	const session = useSessionStore.getState().session;
	const scan = useScanStore.getState();
	const pdf = scan.selectedPdf;
	if (!pdf || !session) return;
	scan.startProcessing("pdf");
	try {
		const uploaded = await scanTicket(session.token, [{ uri: pdf.uri, base64: pdf.base64 }], "application/pdf");
		scan.addAwaiting(uploaded.id);
		scan.setSelectedPdf(null);
		nav.selectTab("history");
	} catch (error) {
		scan.setOcrError(error instanceof Error ? error.message : "Error al subir el PDF");
		nav.push("ScanError");
	} finally {
		scan.finishProcessing();
	}
}

export function handleOcrRetry(): void {
	useScanStore.getState().resetForRetry();
	nav.backTo("CaptureTicket");
}
