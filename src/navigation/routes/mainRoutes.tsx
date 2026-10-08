import { useEffect } from "react";
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
	ShoppingListScreen,
	StoreDetailScreen,
	TicketDetailScreen,
	TicketHistoryScreen,
	TicketProcessedScreen,
} from "../../screens";
import { resolveOffer } from "../../services";
import {
	isFollowing,
	isOnShoppingList,
	useOffersStore,
	usePointsStore,
	useSavedProductsStore,
	useScanStore,
	useSessionStore,
} from "../../store";
import {
	addScannedToList,
	clearCheckedListItems,
	followScannedProduct,
	handleChoosePdf,
	handleOcrRetry,
	handleSelectTicket,
	handleSendPdf,
	handleSendPhotos,
	loadSavedProducts,
	openOffer,
	removeListItem,
	setListItemChecked,
	setListItemQuantity,
	unfollowProduct,
} from "../actions";
import { nav, navigationRef } from "../nav";
import type { RootStackParamList } from "../types";
import { useSession, useTabProps } from "./useRouteProps";

type Props<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;

/**
 * "Atrás" para pantallas a las que se llega desde varios lados (Inicio, Perfil, el escáner, una
 * notificación): vuelve a la anterior y, si no hay ninguna —la app se abrió desde la
 * notificación—, va a Inicio en vez de no hacer nada.
 */
function backOrHome(): void {
	if (navigationRef.isReady() && navigationRef.canGoBack()) nav.goBack();
	else nav.goMain("home");
}

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
				onOpenShoppingList={() => nav.push("ShoppingList")}
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
			onOpenShoppingList={() => nav.push("ShoppingList")}
			onOpenFollowed={() => nav.push("FollowedProducts")}
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
	const list = useSavedProductsStore((s) => s.list);
	const followedEans = useSavedProductsStore((s) => s.followedEans);
	const token = session?.token;
	useEffect(() => {
		if (token) loadSavedProducts();
	}, [token]);
	if (!session) return null;
	return (
		<ScanBarcodeScreen
			session={session}
			onBack={() => nav.goMain("home")}
			onChooseTicket={() => nav.replace("CaptureTicket")}
			onOpenFavorites={() => nav.push("FavoriteStores", { from: "scanBarcode" })}
			isOnList={(ean) => isOnShoppingList(list, ean)}
			isFollowing={(ean) => isFollowing(followedEans, ean)}
			onAddToList={addScannedToList}
			onSetFollowing={async (product, follow) => {
				await (follow ? followScannedProduct(product) : unfollowProduct(product.ean));
			}}
			// Si la lista ya está abajo en la pila (se llegó al escáner desde ella), se vuelve a esa.
			onOpenList={() => nav.backTo("ShoppingList")}
		/>
	);
}

// ── Productos guardados desde el escáner ─────────────────────────────

export function ShoppingListRoute() {
	const session = useSession();
	const tabProps = useTabProps();
	const list = useSavedProductsStore((s) => s.list);
	const status = useSavedProductsStore((s) => s.listStatus);
	const token = session?.token;
	useEffect(() => {
		if (token) void useSavedProductsStore.getState().loadList(token);
	}, [token]);
	if (!session) return null;
	return (
		<ShoppingListScreen
			{...tabProps}
			list={list}
			status={status}
			onBack={backOrHome}
			onRetry={() => void useSavedProductsStore.getState().loadList(session.token)}
			onScanProduct={() => nav.push("ScanBarcode")}
			onSetChecked={(item, checked) => void setListItemChecked(item.id, checked)}
			onSetQuantity={(item, quantity) => void setListItemQuantity(item.id, quantity)}
			onRemove={(item) => void removeListItem(item.id)}
			onClearChecked={() => void clearCheckedListItems()}
			onSeePrices={(item) => nav.push("Compare", { productName: item.description, barcode: item.ean, origin: "shoppingList" })}
		/>
	);
}

export function FollowedProductsRoute() {
	const session = useSession();
	const tabProps = useTabProps();
	if (!session) return null;
	return (
		<FollowedProductsScreen
			{...tabProps}
			session={session}
			onBack={backOrHome}
			onScanProduct={() => nav.push("ScanBarcode")}
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
				else if (origin === "shoppingList") nav.backTo("ShoppingList");
				else if (origin === "followedProducts") nav.backTo("FollowedProducts");
				else nav.goMain("home");
			}}
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
