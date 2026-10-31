import { useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { setBiometricPreference, storeToken } from "../../auth/biometricAuth";
import {
	CaptureTicketScreen,
	ComparePricesScreen,
	FavoriteStoresScreen,
	FollowedProductsScreen,
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
import { isFollowing, useFollowedProductsStore, useOffersStore, usePointsStore, useScanStore, useSessionStore } from "../../store";
import {
	followScannedProduct,
	handleChoosePdf,
	handleOcrRetry,
	handleSelectTicket,
	handleSendPdf,
	handleSendPhotos,
	openOffer,
	unfollowProduct,
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
	const followedEans = useFollowedProductsStore((s) => s.followedEans);
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
				onOpenFollowed={() => nav.push("FollowedProducts")}
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
			onOpenFollowed={() => nav.push("FollowedProducts")}
			onOpenOffer={openOffer}
			followedEans={followedEans}
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
	const followedEans = useFollowedProductsStore((s) => s.followedEans);
	if (!session) return null;
	return (
		<RecurringProductsScreen
			{...tabProps}
			session={session}
			onOpenOffer={openOffer}
			onBack={() => nav.goMain("home")}
			followedEans={followedEans}
		/>
	);
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
			onChooseBarcode={() => nav.replace("ScanBarcode", { origin: "scan" })}
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

export function ScanBarcodeRoute({ route }: Props<"ScanBarcode">) {
	const session = useSession();
	const followedEans = useFollowedProductsStore((s) => s.followedEans);
	if (!session) return null;
	const { origin } = route.params;
	return (
		<ScanBarcodeScreen
			session={session}
			onBack={() => {
				// Desde la lista de seguidos o desde Compare se vuelve a esa pantalla (antes iba a
				// Inicio y sacaba la lista de la pila); desde la pestaña Escanear, a Inicio.
				if (origin === "followedProducts") nav.backTo("FollowedProducts");
				else if (origin === "compare") nav.goBack();
				else nav.goMain("home");
			}}
			onChooseTicket={() => nav.replace("CaptureTicket")}
			onOpenFavorites={() => nav.push("FavoriteStores", { from: "scanBarcode" })}
			isFollowing={(ean) => isFollowing(followedEans, ean)}
			onSetFollowing={async (product, follow) => {
				await (follow ? followScannedProduct(product) : unfollowProduct(product.ean));
			}}
		/>
	);
}

// ── Productos seguidos ───────────────────────────────────────────────

export function FollowedProductsRoute() {
	const session = useSession();
	const tabProps = useTabProps();
	// Al volver del escáner la lista tiene que mostrar lo que se acaba de seguir.
	const focused = useIsFocused();
	if (!session) return null;
	return (
		<FollowedProductsScreen
			{...tabProps}
			session={session}
			focused={focused}
			// Se llega desde Inicio, Perfil o una notificación: "atrás" vuelve a donde estaba.
			onBack={nav.goBack}
			onScanProduct={() => nav.push("ScanBarcode", { origin: "followedProducts" })}
			onUnfollow={(product) => unfollowProduct(product.ean)}
			onSeePrices={(product) =>
				nav.push("Compare", { productName: product.description, barcode: product.ean, origin: "followedProducts" })
			}
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
			onBack={() => {
				if (origin === "ticketProcessed") nav.backTo("TicketProcessed");
				else if (origin === "followedProducts") nav.backTo("FollowedProducts");
				else nav.goMain("home");
			}}
			onScanBarcode={() => nav.push("ScanBarcode", { origin: "compare" })}
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
			// Desde el escáner o Compare siempre se llega con push: goBack vuelve a esa pantalla con sus
			// parámetros. popTo sin parámetros (backTo) se los borraba, y Compare los necesita.
			onBack={() => (from === "profile" ? nav.goMain("profile") : nav.goBack())}
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
