import { useState, useEffect, useRef } from "react";
import { ActivityIndicator, BackHandler, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import {
	AuthLoginScreen,
	AuthWelcomeScreen,
	BiometricLockScreen,
	BiometricPromptScreen,
	CaptureTicketScreen,
	ChangePasswordScreen,
	ChangePasswordAuthScreen,
	CheckEmailScreen,
	ComparePricesScreen,
	ConfirmRedeemScreen,
	FavoriteStoresScreen,
	GoogleChooseAccountScreen,
	GoogleFirstTimeScreen,
	GoogleVerifyingScreen,
	HelpCenterScreen,
	HomeScreen,
	LoaderScreen,
	LocationPermissionScreen,
	LogoutConfirmScreen,
	MonthlyAnalysisScreen,
	OfferDetailScreen,
	OffersScreen,
	PasswordRecoveryScreen,
	PasswordSuccessScreen,
	PaymentMethodsScreen,
	PersonalDataScreen,
	PdfConfirmScreen,
	PointsHistoryScreen,
	PointsScreen,
	ProfileScreen,
	RecurringProductsScreen,
	RedeemSuccessScreen,
	RegisterStep1,
	RegisterStep2,
	RewardDetailScreen,
	ScanBarcodeScreen,
	ScanErrorScreen,
	ScanMethodScreen,
	SmartShoppingListScreen,
	StoreDetailScreen,
	TicketDetailScreen,
	TicketHistoryScreen,
	TicketProcessedScreen,
	WelcomeTransitionScreen,
} from "./src/screens";
import type { TabKey } from "./src/components";
import { LoadingOverlay, OnboardingProvider, Toast } from "./src/components";
import type { PointsHistoryEntry } from "./src/screens/PointsHistoryScreen";
import { MOCK_USER } from "./src/auth/mockAuth";
import type { Session } from "./src/auth/session";
import { splitName } from "./src/auth/session";
import { storeToken, clearStoredToken, getStoredToken, getBiometricPreference, setBiometricPreference, getPromptDismissed, setPromptDismissed, isBiometricAvailable } from "./src/auth/biometricAuth";
import { getOffers, getTicket, scanTicket } from "./src/services";
import type { Offer, NearbyStore, TicketResponse } from "./src/services";
import { REWARDS, POINTS_PER_REFERRAL } from "./src/data/rewards";
import { colors, ThemePreferenceProvider } from "./src/theme/designSystem";

type Screen =
	| "biometricLock" | "biometricPrompt" | "welcome" | "login" | "register1" | "register2" | "loader"
	| "welcomeTransition" | "locationPermission"
	| "googleChoose" | "googleVerifying" | "googleFirstTime"
	| "passwordRecovery" | "checkEmail" | "changePassword" | "passwordSuccess" | "changePasswordAuth"
	| "main"
	| "scanMethod" | "captureTicket" | "pdfConfirm" | "scanError" | "ticketProcessed"
	| "scanBarcode"
	| "compare" | "storeDetail"
	| "offerDetail"
	| "points" | "rewardDetail" | "confirmRedeem" | "redeemSuccess"
	| "pointsHistory"
	| "personalData" | "paymentMethods" | "favoriteStores" | "helpCenter" | "logoutConfirm"
	| "ticketHistory" | "ticketDetail" | "monthlyAnalysis" | "recurringProducts" | "smartList";

export default function App() {
	const [screen, setScreen] = useState<Screen>("welcome");
	const [tab, setTab] = useState<TabKey>("home");
	const [session, setSession] = useState<Session | null>(null);
	const [registerData, setRegisterData] = useState<{ firstName: string; lastName: string; email: string; phone: string; referralCode: string } | null>(null);
	const [compareProduct, setCompareProduct] = useState<string>("Aceite Natura girasol 1.5L");
	const [compareBarcode, setCompareBarcode] = useState<string | null>(null);
	const [selectedStore, setSelectedStore] = useState<NearbyStore | null>(null);
	const [compareOrigin, setCompareOrigin] = useState<"main" | "ticketProcessed">("main");
	const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
	/** An offer opened from somewhere other than the feed — the feed is paged
	 * and filtered by favourite chains, so the promotion a product matched is
	 * often not in it. */
	const [fallbackOffer, setFallbackOffer] = useState<Offer | null>(null);
	// Ofertas reales derivadas de /products/recurring. Viven aca porque la
	// pantalla de detalle se resuelve por id desde el router.
	const [offers, setOffers] = useState<Offer[]>([]);
	const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
	const [redeemRemaining, setRedeemRemaining] = useState<number>(0);
	const [referralPoints, setReferralPoints] = useState<number>(0);
	const [referralHistory, setReferralHistory] = useState<PointsHistoryEntry[]>([]);

	const [selectedPdf, setSelectedPdf] = useState<{ name: string; uri: string; base64: string } | null>(null);
	const [scannedTicket, setScannedTicket] = useState<TicketResponse | null>(null);
	const [ocrErrorMsg, setOcrErrorMsg] = useState<string>("");
	const [processingOcr, setProcessingOcr] = useState(false);
	const [processingFileType, setProcessingFileType] = useState<"pdf" | "image" | null>(null);
	const [biometricEnabled, setBiometricEnabled] = useState(false);
	const [showBiometricOnWelcome, setShowBiometricOnWelcome] = useState(false);
	const [booted, setBooted] = useState(false);
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
	// Tickets subidos en esta sesion que todavia no avisaron si faltó algo.
	// Viven aca y no en el historial para que el aviso siga pendiente si el
	// usuario se va a otra pantalla mientras el OCR corre en el servidor.
	const [awaitingTicketIds, setAwaitingTicketIds] = useState<number[]>([]);

	// Historial de pantallas visitadas, para que el botón físico Back de
	// Android navegue hacia atrás en vez de cerrar la app directamente.
	const screenHistoryRef = useRef<Screen[]>([]);
	const prevScreenRef = useRef<Screen>(screen);

	useEffect(() => {
		if (prevScreenRef.current !== screen) {
			screenHistoryRef.current.push(prevScreenRef.current);
			prevScreenRef.current = screen;
		}
	}, [screen]);

	useEffect(() => {
		if (Platform.OS !== "android") return;
		const sub = BackHandler.addEventListener("hardwareBackPress", () => {
			const previous = screenHistoryRef.current.pop();
			if (!previous) return false;
			prevScreenRef.current = previous;
			setScreen(previous);
			return true;
		});
		return () => sub.remove();
	}, []);

	useEffect(() => {
		(async () => {
			try {
				const [pref, available, token] = await Promise.all([
					getBiometricPreference(),
					isBiometricAvailable(),
					getStoredToken(),
				]);
				if (pref) setBiometricEnabled(true);
				if (available && token) setShowBiometricOnWelcome(true);
			} catch {
				// SecureStore puede fallar en algunos entornos
			} finally {
				setBooted(true);
			}
		})();
	}, []);

	// The offer-detail screen is routed by id, so the list has to live above the
	// screens rather than inside each one.
	useEffect(() => {
		if (!session) {
			setOffers([]);
			return;
		}
		getOffers(session.token, 1, 50)
			.then((p) => setOffers(p.items))
			.catch(() => setOffers([]));
	}, [session]);

	const goMain = (t: TabKey = "home") => { setTab(t); setScreen("main"); };

	/**
	 * A ticket scanned while the app was closed finishes processing without the
	 * user ever reaching TicketProcessedScreen, so the one editable pass over
	 * the OCR output has to be reachable from the history too. Reviewed tickets
	 * are already closed for edits and go to the read-only detail.
	 */
	const handleSelectTicket = async (t: TicketResponse) => {
		if (t.status !== "PROCESSED" || t.reviewed || !session) {
			setSelectedTicketId(t.id);
			setScreen("ticketDetail");
			return;
		}
		try {
			const full = await getTicket(session.token, t.id);
			setScannedTicket(full);
			setScreen("ticketProcessed");
		} catch {
			// Showing it read-only beats showing nothing.
			setSelectedTicketId(t.id);
			setScreen("ticketDetail");
		}
	};
	const handleScanPress = () => { setTab("scan"); setScreen("scanMethod"); };
	const handleSelectTab = (t: TabKey) => {
		if (t === "scan") return handleScanPress();
		if (t === "history") { setTab(t); setScreen("ticketHistory"); return; }
		setTab(t);
		setScreen("main");
	};
	const handleLogout = () => {
		setSession(null); setTab("home"); setOffers([]); setAwaitingTicketIds([]); setBiometricEnabled(false); setScreen("welcome");
		// El sistema de puntos por referidos es solo-frontend (sin backend
		// todavía), así que sin este reset el saldo y el historial de una
		// cuenta quedarían visibles para la próxima que inicie sesión en el
		// mismo dispositivo.
		setReferralPoints(0);
		setReferralHistory([]);
		clearStoredToken();
	};

	const handlePostLogin = async () => {
		try {
			const available = await isBiometricAvailable();
			if (!available) { goMain("home"); return; }
			const pref = await getBiometricPreference();
			if (pref) { goMain("home"); return; }
			const dismissed = await getPromptDismissed();
			if (dismissed) { goMain("home"); return; }
			setScreen("biometricPrompt");
		} catch {
			goMain("home");
		}
	};

	const findOffer = (id: string | null) =>
		offers.find((o) => o.id === id) ?? (fallbackOffer?.id === id ? fallbackOffer : null);
	const findReward = (id: string | null) => REWARDS.find((r) => r.id === id) ?? REWARDS[0];

	const enterMain = (ss: Session) => {
		setSession(ss);
		goMain("home");
	};

	const openOffer = (id: string, fallback?: Offer | null) => {
		setSelectedOfferId(id);
		setFallbackOffer(fallback ?? null);
		setScreen("offerDetail");
	};

	const handleChoosePdf = async () => {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				type: "application/pdf",
				copyToCacheDirectory: true,
			});

			if (result.canceled || !result.assets || result.assets.length === 0) {
				return;
			}

			const asset = result.assets[0];
			const base64 = await FileSystem.readAsStringAsync(asset.uri, {
				encoding: "base64" as const,
			});

		setSelectedPdf({ name: asset.name ?? "ticket.pdf", uri: asset.uri, base64 });
			setScreen("pdfConfirm");
		} catch (error) {
			setOcrErrorMsg(error instanceof Error ? error.message : "No se pudo leer el PDF");
			setScreen("scanError");
		}
	};

	const handleSendPhotos = async (photos: { id: string; uri: string; base64?: string }[]) => {
		if (photos.length === 0 || !session) return;
		setProcessingFileType("image");
		setProcessingOcr(true);
		try {
			// The upload returns as soon as the images are stored; the OCR runs
			// on the server, so the user is free to navigate (and it finishes
			// even if they lose connection or close the app).
			const uploaded = await scanTicket(session.token, photos);
			setAwaitingTicketIds((prev) => [uploaded.id, ...prev]);
			setScreen("ticketHistory");
		} catch (error) {
			setOcrErrorMsg(error instanceof Error ? error.message : "Error al subir el ticket");
			setScreen("scanError");
		} finally {
			setProcessingOcr(false);
			setProcessingFileType(null);
		}
	};

	const handleSendPdf = async () => {
		if (!selectedPdf || !session) return;
		setProcessingFileType("pdf");
		setProcessingOcr(true);
		try {
			const uploaded = await scanTicket(
				session.token,
				[{ uri: selectedPdf.uri, base64: selectedPdf.base64 }],
				"application/pdf",
			);
			setAwaitingTicketIds((prev) => [uploaded.id, ...prev]);
			setSelectedPdf(null);
			setScreen("ticketHistory");
		} catch (error) {
			setOcrErrorMsg(error instanceof Error ? error.message : "Error al subir el PDF");
			setScreen("scanError");
		} finally {
			setProcessingOcr(false);
			setProcessingFileType(null);
		}
	};

	const handleOcrRetry = () => {
		setScannedTicket(null);
		setOcrErrorMsg("");
		setSelectedPdf(null);
		setProcessingFileType(null);
		setScreen("scanMethod");
	};

	return (
		<ThemePreferenceProvider>
		<SafeAreaProvider>
			<OnboardingProvider
				eligible={Boolean(session && screen === "main" && tab === "home")}
				userKey={
					session
						? `${session.user.id}:${session.user.email.trim().toLowerCase()}`
						: null
				}
			>
				{!booted && (
				<View style={{ flex: 1, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
					<ActivityIndicator size="small" color={colors.cyan} />
				</View>
				)}

			{screen === "biometricLock" && (
				<BiometricLockScreen
					onSuccess={(s) => { setSession(s); goMain("home"); }}
					onFallback={() => { setBiometricEnabled(false); setScreen("welcome"); }}
				/>
			)}

			{screen === "biometricPrompt" && session && (
				<BiometricPromptScreen
					session={session}
					onEnable={() => { setBiometricEnabled(true); goMain("home"); }}
					onDismiss={async () => {
						await setPromptDismissed();
						goMain("home");
					}}
				/>
			)}

			{screen === "welcome" && (
				<AuthWelcomeScreen
					onAlreadyHaveAccount={() => setScreen("login")}
					onCreateAccount={() => setScreen("register1")}
					showBiometricButton={showBiometricOnWelcome}
					onBiometricLogin={() => setScreen("biometricLock")}
				/>
			)}

			{screen === "login" && (
				<AuthLoginScreen
					onBackPress={() => setScreen("welcome")}
					onGoToRegister={() => setScreen("register1")}
					onLoginSuccess={async (s) => {
						setSession(s);
						setScreen("loader");
						const pref = await getBiometricPreference();
						if (pref) {
							setBiometricEnabled(true);
							await storeToken(s.token);
						}
					}}
					onForgotPassword={() => setScreen("passwordRecovery")}
				/>
			)}

			{screen === "register1" && (
				<RegisterStep1
					onBack={() => setScreen("welcome")}
					onNext={(data) => { setRegisterData(data); setScreen("register2"); }}
					onGoToLogin={() => setScreen("login")}
				/>
			)}

			{screen === "register2" && registerData && (
				<RegisterStep2
					firstName={registerData.firstName}
					lastName={registerData.lastName}
					email={registerData.email}
					phone={registerData.phone}
					onBack={() => setScreen("register1")}
					onNext={(s) => {
						setSession(s);
						if (registerData.referralCode) {
							setReferralPoints((prev) => prev + POINTS_PER_REFERRAL);
							setReferralHistory((prev) => [
								{
									id: `referral-${Date.now()}`,
									icon: "people-outline",
									title: "Te registraste con un código de invitación",
									date: new Date().toLocaleDateString("es-AR", {
										day: "numeric",
										month: "short",
										hour: "2-digit",
										minute: "2-digit",
									}),
									pts: POINTS_PER_REFERRAL,
								},
								...prev,
							]);
						}
						setScreen("locationPermission");
					}}
				/>
			)}

			{screen === "locationPermission" && (
				<LocationPermissionScreen
					onAllow={() => setScreen("welcomeTransition")}
					onSkip={() => setScreen("welcomeTransition")}
				/>
			)}

			{screen === "welcomeTransition" && session && (
				<WelcomeTransitionScreen name={splitName(session.user.name).firstName} onDone={() => enterMain(session)} />
			)}

			{screen === "loader" && (
				<LoaderScreen onDone={handlePostLogin} />
			)}

			{screen === "googleChoose" && (
				<GoogleChooseAccountScreen
					onBack={() => setScreen("login")}
					onSelect={() => setScreen("googleVerifying")}
				/>
			)}

			{screen === "googleVerifying" && (
				<GoogleVerifyingScreen onDone={() => setScreen("googleFirstTime")} />
			)}

			{screen === "googleFirstTime" && (
				<GoogleFirstTimeScreen
					onBack={() => setScreen("login")}
					onComplete={() => {
						setSession({
							token: "",
							user: {
								id: 0,
								name: `${MOCK_USER.firstName} ${MOCK_USER.lastName}`,
								email: MOCK_USER.email,
								profilePicture: null,
								address: null,
								phone: null,
								alternativeBrandsEnabled: true,
								createdAt: "",
							},
						});
						setScreen("welcomeTransition");
					}}
				/>
			)}

			{screen === "passwordRecovery" && (
				<PasswordRecoveryScreen
					onBack={() => setScreen("login")}
					onSubmit={() => setScreen("checkEmail")}
				/>
			)}

			{screen === "checkEmail" && (
				<CheckEmailScreen
					onBack={() => setScreen("passwordRecovery")}
					onOpenChange={() => setScreen("changePassword")}
				/>
			)}

			{screen === "changePassword" && (
				<ChangePasswordScreen
					onBack={() => setScreen("checkEmail")}
					onSuccess={() => setScreen("passwordSuccess")}
				/>
			)}

			{screen === "changePasswordAuth" && session && (
				<ChangePasswordAuthScreen
					session={session}
					biometricEnabled={biometricEnabled}
					onBack={(msg) => { if (msg) setToastMessage(msg); goMain("profile"); }}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "passwordSuccess" && (
				<PasswordSuccessScreen onGoToLogin={() => setScreen("login")} />
			)}

			{screen === "main" && session && tab === "home" && (
				<HomeScreen
					session={session}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
					onOpenHistory={() => { setTab("history"); setScreen("ticketHistory"); }}
					onOpenAnalysis={() => setScreen("monthlyAnalysis")}
					onOpenRecurring={() => setScreen("recurringProducts")}
					onOpenSmartList={() => setScreen("smartList")}
					onOpenOffer={openOffer}
				/>
			)}

			{screen === "main" && session && tab === "offers" && (
				<OffersScreen
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
					session={session}
					onOpenOffer={openOffer}
				/>
			)}

			{screen === "points" && session && (
				<PointsScreen
					session={session}
					pointsBalance={referralPoints}
					onBack={() => goMain("profile")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
					onSelectReward={(id) => { setSelectedRewardId(id); setScreen("rewardDetail"); }}
					onShowHistory={() => setScreen("pointsHistory")}
				/>
			)}

			{screen === "main" && session && tab === "profile" && (
				<ProfileScreen
					onSessionUpdate={setSession}
					session={session}
					referralPoints={referralPoints}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
					onLogout={() => setScreen("logoutConfirm")}
					onOpenPersonalData={() => setScreen("personalData")}
					onOpenPayment={() => setScreen("paymentMethods")}
					onOpenStores={() => setScreen("favoriteStores")}
					onOpenSavings={() => { setTab("history"); setScreen("ticketHistory"); }}
					onOpenPoints={() => setScreen("points")}
					onOpenHelp={() => setScreen("helpCenter")}
					onChangePassword={() => setScreen("changePasswordAuth")}
					biometricEnabled={biometricEnabled}
					onToggleBiometric={async (enabled) => {
						if (enabled && session) {
							await storeToken(session.token);
							await setBiometricPreference(true);
							setBiometricEnabled(true);
						} else {
							await setBiometricPreference(false);
							setBiometricEnabled(false);
						}
					}}
				/>
			)}

			{screen === "scanMethod" && (
				<ScanMethodScreen
					onChoosePhotos={() => setScreen("captureTicket")}
					onChoosePdf={handleChoosePdf}
					onChooseBarcode={() => setScreen("scanBarcode")}
					onBack={() => goMain("home")}
				/>
			)}

			{screen === "scanBarcode" && (
				<ScanBarcodeScreen onBack={() => setScreen("scanMethod")} />
			)}

			{screen === "captureTicket" && (
				<CaptureTicketScreen
					onBack={() => setScreen("scanMethod")}
					onSend={handleSendPhotos}
				/>
			)}

			{screen === "pdfConfirm" && selectedPdf && (
				<PdfConfirmScreen
					pdfName={selectedPdf.name}
					onSend={handleSendPdf}
					onCancel={() => { setSelectedPdf(null); setScreen("scanMethod"); }}
				/>
			)}

			{screen === "ticketProcessed" && session && (
				<TicketProcessedScreen
					ticket={scannedTicket}
					session={session}
					onBack={() => setScreen("ticketHistory")}
					onFinish={() => setScreen("ticketHistory")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
					onSelectProduct={(name, barcode) => {
						setCompareProduct(name);
						setCompareBarcode(barcode);
						setCompareOrigin("ticketProcessed");
						setScreen("compare");
					}}
				/>
			)}

			{screen === "scanError" && (
				<ScanErrorScreen
					errorMessage={ocrErrorMsg}
					onRetry={handleOcrRetry}
					onSeeOffers={() => goMain("offers")}
					onBack={() => goMain("home")}
				/>
			)}

			{screen === "compare" && (
				<ComparePricesScreen
					productName={compareProduct}
					barcode={compareBarcode}
					onBack={() => {
						if (compareOrigin === "ticketProcessed") setScreen("ticketProcessed");
						else setScreen("main");
					}}
					onScanBarcode={() => setScreen("scanBarcode")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "storeDetail" && (
				<StoreDetailScreen
					store={selectedStore}
					onBack={() => setScreen("favoriteStores")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "offerDetail" && findOffer(selectedOfferId) && (
				<OfferDetailScreen
					offer={findOffer(selectedOfferId)!}
					onBack={() => goMain("offers")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "rewardDetail" && selectedRewardId && (
				<RewardDetailScreen
					reward={findReward(selectedRewardId)}
					pointsBalance={referralPoints}
					onBack={() => setScreen("points")}
					onRedeem={() => setScreen("confirmRedeem")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "confirmRedeem" && selectedRewardId && (
				<ConfirmRedeemScreen
					reward={findReward(selectedRewardId)}
					pointsBalance={referralPoints}
					onCancel={() => setScreen("rewardDetail")}
					onConfirm={() => {
						const reward = findReward(selectedRewardId);
						const remaining = referralPoints - reward.points;
						setReferralPoints(remaining);
						setReferralHistory((prev) => [
							{
								id: `redeem-${Date.now()}`,
								icon: reward.icon,
								title: `Canje: ${reward.title}`,
								date: new Date().toLocaleDateString("es-AR", {
									day: "numeric",
									month: "short",
									hour: "2-digit",
									minute: "2-digit",
								}),
								pts: -reward.points,
							},
							...prev,
						]);
						setRedeemRemaining(remaining);
						setScreen("redeemSuccess");
					}}
				/>
			)}

			{screen === "redeemSuccess" && selectedRewardId && (
				<RedeemSuccessScreen
					reward={findReward(selectedRewardId)}
					remainingPoints={redeemRemaining}
					onSeeMy={() => setScreen("pointsHistory")}
					onKeepRedeeming={() => setScreen("points")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "pointsHistory" && (
				<PointsHistoryScreen
					entries={referralHistory}
					onBack={() => setScreen("points")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "personalData" && session && (
				<PersonalDataScreen
					session={session}
					onBack={(msg) => { if (msg) setToastMessage(msg); goMain("profile"); }}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "paymentMethods" && (
				<PaymentMethodsScreen
					onBack={() => goMain("profile")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "favoriteStores" && session && (
				<FavoriteStoresScreen
					onBack={() => goMain("profile")}
					session={session}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
					onSelectStore={(store) => {
						setSelectedStore(store);
						setScreen("storeDetail");
					}}
				/>
			)}

			{screen === "helpCenter" && (
				<HelpCenterScreen
					onBack={() => goMain("profile")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "logoutConfirm" && (
				<LogoutConfirmScreen
					onCancel={() => goMain("profile")}
					onConfirm={handleLogout}
				/>
			)}

			{screen === "ticketHistory" && session && (
				<TicketHistoryScreen
					onBack={() => goMain("home")}
					onSelectTicket={handleSelectTicket}
					session={session}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
					awaitingTicketIds={awaitingTicketIds}
					onTicketAnnounced={(id) =>
						setAwaitingTicketIds((prev) => prev.filter((x) => x !== id))
					}
				/>
			)}

			{screen === "ticketDetail" && session && selectedTicketId && (
				<TicketDetailScreen
					ticketId={selectedTicketId}
					onBack={() => setScreen("ticketHistory")}
					session={session}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "monthlyAnalysis" && session && (
				<MonthlyAnalysisScreen
					onBack={() => goMain("home")}
					session={session}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "recurringProducts" && session && (
				<RecurringProductsScreen
					onOpenOffer={openOffer}
					onBack={() => goMain("home")}
					session={session}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "smartList" && session && (
				<SmartShoppingListScreen
					onBack={() => goMain("home")}
					session={session}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{processingOcr && processingFileType && (
				<LoadingOverlay fileType={processingFileType} />
			)}

			{toastMessage && (
				<Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
			)}
			</OnboardingProvider>
		</SafeAreaProvider>
		</ThemePreferenceProvider>
	);
}
