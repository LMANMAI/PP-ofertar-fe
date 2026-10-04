import { useState, useEffect, useRef } from "react";
import { useFonts } from "expo-font";
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans";
import { ActivityIndicator, BackHandler, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Notifications from "expo-notifications";
import { useAppBootstrap } from "./src/hooks/useAppBootstrap";
import { resetAllStores, useOffersStore, usePointsStore, useScanStore, useSessionStore, useUiStore } from "./src/store";

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
	PlansScreen,
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
	HabitualPurchaseScreen,
	StoreDetailScreen,
	TicketDetailScreen,
	TicketHistoryScreen,
	TicketProcessedScreen,
	WelcomeTransitionScreen,
} from "./src/screens";
import type { TabKey } from "./src/components";
import { LoadingOverlay, OnboardingProvider, ScreenTransition, Toast } from "./src/components";
import type { Session } from "./src/auth/session";
import { splitName } from "./src/auth/session";
import { storeToken, clearStoredToken, getBiometricPreference, setBiometricPreference, getPromptDismissed, setPromptDismissed, isBiometricAvailable } from "./src/auth/biometricAuth";
import { getTicket, resolveOffer, scanTicket } from "./src/services";
import type { Offer, NearbyStore, TicketResponse } from "./src/services";
import { REWARDS } from "./src/data/rewards";
import { colors, ThemePreferenceProvider } from "./src/theme/designSystem";

type Screen =
	| "biometricLock" | "biometricPrompt" | "welcome" | "login" | "register1" | "register2" | "loader"
	| "welcomeTransition" | "locationPermission"
	| "passwordRecovery" | "checkEmail" | "changePassword" | "passwordSuccess" | "changePasswordAuth"
	| "main"
	| "captureTicket" | "pdfConfirm" | "scanError" | "ticketProcessed"
	| "scanBarcode"
	| "compare" | "storeDetail"
	| "offerDetail"
	| "points" | "rewardDetail" | "confirmRedeem" | "redeemSuccess"
	| "pointsHistory"
	| "personalData" | "paymentMethods" | "plans" | "favoriteStores" | "helpCenter" | "logoutConfirm"
	| "ticketHistory" | "ticketDetail" | "monthlyAnalysis" | "recurringProducts" | "habitualPurchase";

export default function App() {
	// Preload once so each screen's own useFonts resolves from cache (no per-screen spinner).
	useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_700Bold });
	const [screen, setScreen] = useState<Screen>("welcome");
	// Where "Mis tiendas favoritas" was opened from, so back returns there: the
	// scan screens send people there to pick the chains their prices are read for.
	const [favoritesFrom, setFavoritesFrom] = useState<"profile" | "scanBarcode" | "compare">("profile");
	// Password recovery: the email the code went to, and the code once verified.
	const [recoveryEmail, setRecoveryEmail] = useState("");
	const [recoveryCode, setRecoveryCode] = useState("");
	const [registerData, setRegisterData] = useState<{ firstName: string; lastName: string; email: string; referralCode: string } | null>(null);
	const [compareProduct, setCompareProduct] = useState<string>("Aceite Natura girasol 1.5L");
	const [compareBarcode, setCompareBarcode] = useState<string | null>(null);
	const [selectedStore, setSelectedStore] = useState<NearbyStore | null>(null);
	const [compareOrigin, setCompareOrigin] = useState<"main" | "ticketProcessed">("main");
	const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);

	// El resto del estado compartido vive en src/store (sesión, puntos, ofertas, escaneo, interfaz).
	const session = useSessionStore((s) => s.session);
	const setSession = useSessionStore((s) => s.setSession);
	const biometricEnabled = useSessionStore((s) => s.biometricEnabled);
	const setBiometricEnabled = useSessionStore((s) => s.setBiometricEnabled);
	const showBiometricOnWelcome = useSessionStore((s) => s.showBiometricOnWelcome);
	const booted = useSessionStore((s) => s.booted);
	const tab = useUiStore((s) => s.tab);
	const setTab = useUiStore((s) => s.setTab);
	const toastMessage = useUiStore((s) => s.toastMessage);
	const showToast = useUiStore((s) => s.showToast);
	const dismissToast = useUiStore((s) => s.dismissToast);
	const offers = useOffersStore((s) => s.offers);
	const fallbackOffer = useOffersStore((s) => s.fallbackOffer);
	const selectedOfferId = useOffersStore((s) => s.selectedOfferId);
	const openOfferInStore = useOffersStore((s) => s.open);
	const referralPoints = usePointsStore((s) => s.balance);
	const referralHistory = usePointsStore((s) => s.history);
	const redeemRemaining = usePointsStore((s) => s.lastRedeemBalance);
	const selectedPdf = useScanStore((s) => s.selectedPdf);
	const scannedTicket = useScanStore((s) => s.scannedTicket);
	const ocrErrorMsg = useScanStore((s) => s.ocrErrorMsg);
	const processingOcr = useScanStore((s) => s.processingOcr);
	const processingFileType = useScanStore((s) => s.processingFileType);
	const selectedTicketId = useScanStore((s) => s.selectedTicketId);
	const awaitingTicketIds = useScanStore((s) => s.awaitingTicketIds);
	// Acciones del escaneo: se leen al usarlas, no suscriben a App a cada cambio.
	const scan = useScanStore.getState;

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

	useAppBootstrap();

	const goMain = (t: TabKey = "home") => { setTab(t); setScreen("main"); };

	useEffect(() => {
		Notifications.setNotificationHandler({
			handleNotification: async () => ({
				shouldShowBanner: true,
				shouldShowList: true,
				shouldPlaySound: true,
				shouldSetBadge: false,
			}),
		});

		const sub = Notifications.addNotificationResponseReceivedListener((response) => {
			const data = response.notification.request.content.data as { screen?: string; ticketId?: string };
			if (data.screen === "ticketDetail" && data.ticketId) {
				scan().setSelectedTicketId(Number(data.ticketId));
				setScreen("ticketDetail");
				return;
			}
			if (data.screen === "pointsHistory") {
				setScreen("pointsHistory");
				return;
			}
			if (data.screen === "ticketHistory") {
				setTab("history");
				setScreen("ticketHistory");
				return;
			}
			if (data.screen === "scanMethod") {
				setTab("scan");
				setScreen("captureTicket");
				return;
			}
			if (data.screen === "offers") {
				goMain("offers");
				return;
			}
			goMain("home");
		});
		return () => sub.remove();
		// goMain, setTab y scan solo usan setters estables: el listener se registra una vez.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	/**
	 * A ticket scanned while the app was closed finishes processing without the
	 * user ever reaching TicketProcessedScreen, so the one editable pass over
	 * the OCR output has to be reachable from the history too. Reviewed tickets
	 * are already closed for edits and go to the read-only detail.
	 */
	const handleSelectTicket = async (t: TicketResponse) => {
		if (t.status !== "PROCESSED" || t.reviewed || !session) {
			scan().setSelectedTicketId(t.id);
			setScreen("ticketDetail");
			return;
		}
		try {
			const full = await getTicket(session.token, t.id);
			scan().setScannedTicket(full);
			setScreen("ticketProcessed");
		} catch {
			// Showing it read-only beats showing nothing.
			scan().setSelectedTicketId(t.id);
			setScreen("ticketDetail");
		}
	};
	const handleScanPress = () => { setTab("scan"); setScreen("captureTicket"); };
	const handleSelectTab = (t: TabKey) => {
		if (t === "scan") return handleScanPress();
		if (t === "history") { setTab(t); setScreen("ticketHistory"); return; }
		setTab(t);
		setScreen("main");
	};
	const handleLogout = () => {
		resetAllStores();
		setScreen("welcome");
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

	const findOffer = (id: string | null) => resolveOffer(offers, id, fallbackOffer);
	const findReward = (id: string | null) => REWARDS.find((r) => r.id === id) ?? REWARDS[0];

	const enterMain = (ss: Session) => {
		setSession(ss);
		goMain("home");
	};

	const openOffer = (id: string, fallback?: Offer | null) => {
		openOfferInStore(id, fallback);
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

		scan().setSelectedPdf({ name: asset.name ?? "ticket.pdf", uri: asset.uri, base64 });
			setScreen("pdfConfirm");
		} catch (error) {
			scan().setOcrError(error instanceof Error ? error.message : "No se pudo leer el PDF");
			setScreen("scanError");
		}
	};

	const handleSendPhotos = async (photos: { id: string; uri: string; base64?: string }[]) => {
		if (photos.length === 0 || !session) return;
		scan().startProcessing("image");
		try {
			// The upload returns as soon as the images are stored; the OCR runs
			// on the server, so the user is free to navigate (and it finishes
			// even if they lose connection or close the app).
			const uploaded = await scanTicket(session.token, photos);
			scan().addAwaiting(uploaded.id);
			setScreen("ticketHistory");
		} catch (error) {
			scan().setOcrError(error instanceof Error ? error.message : "Error al subir el ticket");
			setScreen("scanError");
		} finally {
			scan().finishProcessing();
		}
	};

	const handleSendPdf = async () => {
		if (!selectedPdf || !session) return;
		scan().startProcessing("pdf");
		try {
			const uploaded = await scanTicket(
				session.token,
				[{ uri: selectedPdf.uri, base64: selectedPdf.base64 }],
				"application/pdf",
			);
			scan().addAwaiting(uploaded.id);
			scan().setSelectedPdf(null);
			setScreen("ticketHistory");
		} catch (error) {
			scan().setOcrError(error instanceof Error ? error.message : "Error al subir el PDF");
			setScreen("scanError");
		} finally {
			scan().finishProcessing();
		}
	};

	const handleOcrRetry = () => {
		scan().resetForRetry();
		setScreen("captureTicket");
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

			<ScreenTransition activeKey={screen}>
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
					showBiometricButton={showBiometricOnWelcome}
					onBiometricLogin={() => setScreen("biometricLock")}
				/>
			)}

			{screen === "register1" && (
				<RegisterStep1
					initialData={registerData}
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
					referralCode={registerData.referralCode}
					onBack={() => setScreen("register1")}
					onGoToLogin={() => setScreen("login")}
					onNext={(s) => {
						// El código viaja en el propio POST /auth/register (ver
						// src/services/authApi.ts). El backend acredita ahí los puntos
						// de bienvenida del referido; el efecto de arriba que sigue a
						// `session` los trae apenas se setea acá — no hace falta
						// sumarlos a mano como antes.
						setSession(s);
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

			{screen === "passwordRecovery" && (
				<PasswordRecoveryScreen
					onBack={() => setScreen("login")}
					onSent={(email) => {
						setRecoveryEmail(email);
						setScreen("checkEmail");
					}}
				/>
			)}

			{screen === "checkEmail" && (
				<CheckEmailScreen
					email={recoveryEmail}
					onBack={() => setScreen("passwordRecovery")}
					onVerified={(code) => {
						setRecoveryCode(code);
						setScreen("changePassword");
					}}
				/>
			)}

			{screen === "changePassword" && (
				<ChangePasswordScreen
					email={recoveryEmail}
					code={recoveryCode}
					onBack={() => setScreen("checkEmail")}
					onSuccess={() => {
						setRecoveryCode("");
						setScreen("passwordSuccess");
					}}
				/>
			)}

			{screen === "changePasswordAuth" && session && (
				<ChangePasswordAuthScreen
					session={session}
					onSessionUpdate={setSession}
					biometricEnabled={biometricEnabled}
					onBack={(msg) => { if (msg) showToast(msg); goMain("profile"); }}
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
					onOpenHabitual={() => setScreen("habitualPurchase")}
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
					onOpenPlans={() => setScreen("plans")}
					onOpenStores={() => { setFavoritesFrom("profile"); setScreen("favoriteStores"); }}
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

			{screen === "scanBarcode" && session && (
				<ScanBarcodeScreen
					session={session}
					onBack={() => goMain("home")}
					onChooseTicket={() => setScreen("captureTicket")}
					onOpenFavorites={() => { setFavoritesFrom("scanBarcode"); setScreen("favoriteStores"); }}
				/>
			)}

			{screen === "captureTicket" && (
				<CaptureTicketScreen
					onBack={() => goMain("home")}
					onSend={handleSendPhotos}
					onChoosePdf={handleChoosePdf}
					onChooseBarcode={() => setScreen("scanBarcode")}
				/>
			)}

			{screen === "pdfConfirm" && selectedPdf && (
				<PdfConfirmScreen
					pdfName={selectedPdf.name}
					onSend={handleSendPdf}
					onCancel={() => { scan().setSelectedPdf(null); setScreen("captureTicket"); }}
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

			{screen === "compare" && session && (
				<ComparePricesScreen
					productName={compareProduct}
					barcode={compareBarcode}
					session={session}
					onOpenFavorites={() => { setFavoritesFrom("compare"); setScreen("favoriteStores"); }}
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

			{screen === "offerDetail" && (
				<OfferDetailScreen
					offer={findOffer(selectedOfferId)}
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

			{screen === "confirmRedeem" && selectedRewardId && session && (
				<ConfirmRedeemScreen
					reward={findReward(selectedRewardId)}
					pointsBalance={referralPoints}
					onCancel={() => setScreen("rewardDetail")}
					onConfirm={async () => {
						// El saldo posta vive en el backend: /points/redeem valida ahí mismo que alcancen
						// los puntos (409 si no) y devuelve el saldo actualizado (ver usePointsStore.redeem).
						const reward = findReward(selectedRewardId);
						try {
							const redeemed = await usePointsStore.getState().redeem(session.token, reward.id, reward.points);
							if (redeemed) setScreen("redeemSuccess");
						} catch (err) {
							showToast(err instanceof Error ? err.message : "No se pudo canjear. Probá de nuevo.");
							setScreen("rewardDetail");
						}
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
					onBack={(msg) => { if (msg) showToast(msg); goMain("profile"); }}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
					// An email change re-issues the token for the new address; the one kept
					// for biometric login would stop matching any account.
					onSessionUpdate={(s) => {
						setSession(s);
						if (biometricEnabled) storeToken(s.token).catch(() => {});
					}}
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

			{screen === "plans" && (
				<PlansScreen
					onBack={() => goMain("profile")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "favoriteStores" && session && (
				<FavoriteStoresScreen
					onBack={() => (favoritesFrom === "profile" ? goMain("profile") : setScreen(favoritesFrom))}
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
					onTicketAnnounced={(id) => scan().announce(id)}
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

			{screen === "habitualPurchase" && session && (
				<HabitualPurchaseScreen
					onBack={() => goMain("home")}
					session={session}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
					onOpenRecurring={() => setScreen("recurringProducts")}
				/>
			)}
			</ScreenTransition>

			{processingOcr && processingFileType && (
				<LoadingOverlay fileType={processingFileType} />
			)}

			{toastMessage && (
				<Toast message={toastMessage} onDismiss={dismissToast} />
			)}
			</OnboardingProvider>
		</SafeAreaProvider>
		</ThemePreferenceProvider>
	);
}
