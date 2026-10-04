import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { setBiometricPreference, storeToken } from "../../auth/biometricAuth";
import {
	CaptureTicketScreen,
	ComparePricesScreen,
	FavoriteStoresScreen,
	HabitualPurchaseScreen,
	HomeScreen,
	MonthlyAnalysisScreen,
	OfferDetailScreen,
	OffersScreen,
	PdfConfirmScreen,
	ProfileScreen,
	RecurringProductsScreen,
	ScanBarcodeScreen,
	ScanErrorScreen,
	StoreDetailScreen,
	TicketDetailScreen,
	TicketHistoryScreen,
	TicketProcessedScreen,
} from "../../screens";
import { resolveOffer } from "../../services";
import { useOffersStore, usePointsStore, useScanStore, useSessionStore } from "../../store";
import {
	handleChoosePdf,
	handleOcrRetry,
	handleSelectTicket,
	handleSendPdf,
	handleSendPhotos,
	openOffer,
} from "../actions";
import { nav } from "../nav";
import type { RootStackParamList } from "../types";
import { useSession, useTabProps } from "./useRouteProps";

type Props<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;

/** Pestañas Inicio, Ofertas y Perfil: la que se ve la decide uiStore.tab, así cambiar de pestaña es instantáneo. */
export function MainRoute() {
	const session = useSession();
	const tabProps = useTabProps();
	const referralPoints = usePointsStore((s) => s.balance);
	const biometricEnabled = useSessionStore((s) => s.biometricEnabled);
	if (!session) return null;

	if (tabProps.activeTab === "offers") {
		return <OffersScreen {...tabProps} session={session} onOpenOffer={openOffer} />;
	}

	if (tabProps.activeTab === "profile") {
		return (
			<ProfileScreen
				{...tabProps}
				session={session}
				onSessionUpdate={useSessionStore.getState().setSession}
				referralPoints={referralPoints}
				onLogout={() => nav.push("LogoutConfirm")}
				onOpenPersonalData={() => nav.push("PersonalData")}
				onOpenPayment={() => nav.push("PaymentMethods")}
				onOpenPlans={() => nav.push("Plans")}
				onOpenStores={() => nav.push("FavoriteStores", { from: "profile" })}
				onOpenPoints={() => nav.push("Points")}
				onOpenHelp={() => nav.push("HelpCenter")}
				onChangePassword={() => nav.push("ChangePasswordAuth")}
				biometricEnabled={biometricEnabled}
				onToggleBiometric={async (enabled) => {
					if (enabled) {
						await storeToken(session.token);
						await setBiometricPreference(true);
						useSessionStore.getState().setBiometricEnabled(true);
					} else {
						await setBiometricPreference(false);
						useSessionStore.getState().setBiometricEnabled(false);
					}
				}}
			/>
		);
	}

	return (
		<HomeScreen
			{...tabProps}
			session={session}
			onOpenHistory={() => nav.selectTab("history")}
			onOpenAnalysis={() => nav.push("MonthlyAnalysis")}
			onOpenRecurring={() => nav.push("RecurringProducts")}
			onOpenHabitual={() => nav.push("HabitualPurchase")}
			onOpenOffer={openOffer}
		/>
	);
}

// ── Tickets ──────────────────────────────────────────────────────────

export function TicketHistoryRoute() {
	const session = useSession();
	const tabProps = useTabProps();
	const awaitingTicketIds = useScanStore((s) => s.awaitingTicketIds);
	if (!session) return null;
	return (
		<TicketHistoryScreen
			{...tabProps}
			session={session}
			onBack={() => nav.goMain("home")}
			onSelectTicket={handleSelectTicket}
			awaitingTicketIds={awaitingTicketIds}
			onTicketAnnounced={(id) => useScanStore.getState().announce(id)}
		/>
	);
}

export function TicketDetailRoute({ route }: Props<"TicketDetail">) {
	const session = useSession();
	const tabProps = useTabProps();
	if (!session) return null;
	return (
		<TicketDetailScreen {...tabProps} ticketId={route.params.ticketId} session={session} onBack={() => nav.backTo("TicketHistory")} />
	);
}

export function TicketProcessedRoute() {
	const session = useSession();
	const tabProps = useTabProps();
	const ticket = useScanStore((s) => s.scannedTicket);
	if (!session) return null;
	return (
		<TicketProcessedScreen
			{...tabProps}
			ticket={ticket}
			session={session}
			onBack={() => nav.backTo("TicketHistory")}
			onFinish={() => nav.backTo("TicketHistory")}
			onSelectProduct={(name, barcode) => nav.push("Compare", { productName: name, barcode, origin: "ticketProcessed" })}
		/>
	);
}

export function MonthlyAnalysisRoute() {
	const session = useSession();
	const tabProps = useTabProps();
	if (!session) return null;
	return <MonthlyAnalysisScreen {...tabProps} session={session} onBack={() => nav.goMain("home")} />;
}

export function RecurringProductsRoute() {
	const session = useSession();
	const tabProps = useTabProps();
	if (!session) return null;
	return <RecurringProductsScreen {...tabProps} session={session} onOpenOffer={openOffer} onBack={() => nav.goMain("home")} />;
}

export function HabitualPurchaseRoute() {
	const session = useSession();
	const tabProps = useTabProps();
	if (!session) return null;
	return (
		<HabitualPurchaseScreen
			{...tabProps}
			session={session}
			onBack={() => nav.goMain("home")}
			onOpenRecurring={() => nav.push("RecurringProducts")}
		/>
	);
}

// ── Escaneo ──────────────────────────────────────────────────────────

export function CaptureTicketRoute() {
	return (
		<CaptureTicketScreen
			onBack={() => nav.goMain("home")}
			onSend={handleSendPhotos}
			onChoosePdf={handleChoosePdf}
			onChooseBarcode={() => nav.replace("ScanBarcode")}
		/>
	);
}

export function PdfConfirmRoute() {
	const pdf = useScanStore((s) => s.selectedPdf);
	if (!pdf) return null;
	return (
		<PdfConfirmScreen
			pdfName={pdf.name}
			onSend={handleSendPdf}
			onCancel={() => {
				useScanStore.getState().setSelectedPdf(null);
				nav.backTo("CaptureTicket");
			}}
		/>
	);
}

export function ScanErrorRoute() {
	const message = useScanStore((s) => s.ocrErrorMsg);
	return (
		<ScanErrorScreen
			errorMessage={message}
			onRetry={handleOcrRetry}
			onSeeOffers={() => nav.goMain("offers")}
			onBack={() => nav.goMain("home")}
		/>
	);
}

export function ScanBarcodeRoute() {
	const session = useSession();
	if (!session) return null;
	return (
		<ScanBarcodeScreen
			session={session}
			onBack={() => nav.goMain("home")}
			onChooseTicket={() => nav.replace("CaptureTicket")}
			onOpenFavorites={() => nav.push("FavoriteStores", { from: "scanBarcode" })}
		/>
	);
}

export function CompareRoute({ route }: Props<"Compare">) {
	const session = useSession();
	const tabProps = useTabProps();
	if (!session) return null;
	const { productName, barcode, origin } = route.params;
	return (
		<ComparePricesScreen
			{...tabProps}
			productName={productName}
			barcode={barcode}
			session={session}
			onOpenFavorites={() => nav.push("FavoriteStores", { from: "compare" })}
			onBack={() => (origin === "ticketProcessed" ? nav.backTo("TicketProcessed") : nav.goMain("home"))}
			onScanBarcode={() => nav.push("ScanBarcode")}
		/>
	);
}

export function FavoriteStoresRoute({ route }: Props<"FavoriteStores">) {
	const session = useSession();
	const tabProps = useTabProps();
	if (!session) return null;
	const { from } = route.params;
	return (
		<FavoriteStoresScreen
			{...tabProps}
			session={session}
			onBack={() => (from === "profile" ? nav.goMain("profile") : nav.backTo(from === "scanBarcode" ? "ScanBarcode" : "Compare"))}
			onSelectStore={(store) => nav.push("StoreDetail", { store })}
		/>
	);
}

export function StoreDetailRoute({ route }: Props<"StoreDetail">) {
	const tabProps = useTabProps();
	return <StoreDetailScreen {...tabProps} store={route.params.store} onBack={nav.goBack} />;
}

export function OfferDetailRoute({ route }: Props<"OfferDetail">) {
	const tabProps = useTabProps();
	const offers = useOffersStore((s) => s.offers);
	const fallbackOffer = useOffersStore((s) => s.fallbackOffer);
	return (
		<OfferDetailScreen
			{...tabProps}
			offer={resolveOffer(offers, route.params.offerId, fallbackOffer)}
			onBack={nav.goBack}
		/>
	);
}
