import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { clearStoredToken, getBiometricPreference, getPromptDismissed, isBiometricAvailable } from "../auth/biometricAuth";
import { registerForPushNotifications, type PushRegistrationResult } from "../notifications/pushRegistration";
import { getTicket, scanTicket } from "../services";
import type { FollowProductInput, Offer, TicketResponse } from "../services";
import { friendlyAuthError } from "../services/authApi";
import { resetAllStores, useFollowedProductsStore, useOffersStore, useScanStore, useSessionStore, useUiStore } from "../store";
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

// ── Productos seguidos ───────────────────────────────────────────────

/**
 * Un cambio sobre los productos seguidos. El store recién lo refleja cuando el backend confirma;
 * acá se le cuenta al usuario si no salió, que si no vería el botón quedar igual sin saber por qué.
 */
async function followedChange(change: (token: string) => Promise<void>, done?: string): Promise<boolean> {
	const session = useSessionStore.getState().session;
	if (!session) return false;
	try {
		await change(session.token);
		if (done) useUiStore.getState().showToast(done);
		return true;
	} catch (error) {
		useUiStore.getState().showToast(friendlyAuthError(error), "error");
		return false;
	}
}

/**
 * Seguir un producto es pedir que te avisen, así que es el momento de pedirle el permiso de
 * notificaciones al teléfono (mismo criterio que el interruptor de Perfil). Y el aviso de
 * confirmación solo promete avisar si de verdad se puede: con las notificaciones de ofertas
 * apagadas o sin el permiso, el producto queda seguido igual y se dice qué falta.
 */
export async function followScannedProduct(product: FollowProductInput): Promise<boolean> {
	const session = useSessionStore.getState().session;
	if (!session) return false;
	const followed = await followedChange((token) => useFollowedProductsStore.getState().follow(token, product));
	if (!followed) return false;

	let push: PushRegistrationResult = "unsupported";
	try {
		push = await registerForPushNotifications(session.token, { requestPermission: true });
	} catch {
		// Sin token de push no hay aviso, pero el producto ya quedó seguido.
	}
	const offersPushEnabled = useSessionStore.getState().session?.user.offersPushEnabled ?? true;
	// Expo Go va primero: ahí el push no anda aunque la preferencia esté prendida, y el
	// switch de Perfil está deshabilitado, así que no tiene sentido mandarlo a activarla.
	useUiStore.getState().showToast(
		push === "expoGo"
			? "Lo seguís, pero las notificaciones push no funcionan en Expo Go. Probá con un development build para que te avisemos."
			: !offersPushEnabled
				? "Lo seguís, pero tenés apagadas las notificaciones de ofertas. Activalas desde Perfil para que te avisemos."
				: push === "denied"
					? "Lo seguís, pero OfertAR no tiene permiso para notificarte. Activalo en los ajustes del teléfono para que te avisemos."
					: "Lo seguís. Te avisamos cuando esté en promo.",
	);
	return true;
}

export function unfollowProduct(ean: string): Promise<boolean> {
	return followedChange((token) => useFollowedProductsStore.getState().unfollow(token, ean), "Dejaste de seguirlo.");
}
