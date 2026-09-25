import { useState, useEffect, useRef } from "react";
import { useFonts } from "expo-font";
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans";
import { ActivityIndicator, BackHandler, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { canUsePush, loadNotifications } from "./src/notifications/loadNotifications";
import { registerForPushNotifications } from "./src/notifications/pushRegistration";

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
import type { PointsHistoryEntry } from "./src/screens/PointsHistoryScreen";
import { MOCK_USER } from "./src/auth/mockAuth";
import type { Session } from "./src/auth/session";
import { splitName } from "./src/auth/session";
import { storeToken, clearStoredToken, getStoredToken, getBiometricPreference, setBiometricPreference, getPromptDismissed, setPromptDismissed, isBiometricAvailable } from "./src/auth/biometricAuth";
import { getOffers, getTicket, resolveOffer, scanTicket, getPointsBalance, getPointsHistory, redeemReward } from "./src/services";
import type { Offer, NearbyStore, TicketResponse, PointsTransactionResponse } from "./src/services";
import { REWARDS } from "./src/data/rewards";
import { colors, ThemePreferenceProvider } from "./src/theme/designSystem";

type Screen =
	| "biometricLock" | "biometricPrompt" | "welcome" | "login" | "register1" | "register2" | "loader"
	| "welcomeTransition" | "locationPermission"
	| "googleChoose" | "googleVerifying" | "googleFirstTime"
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
	const [tab, setTab] = useState<TabKey>("home");
	// Where "Mis tiendas favoritas" was opened from, so back returns there: the
	// scan screens send people there to pick the chains their prices are read for.
	const [favoritesFrom, setFavoritesFrom] = useState<"profile" | "scanBarcode" | "compare">("profile");
	const [session, setSession] = useState<Session | null>(null);
	// Password recovery: the email the code went to, and the code once verified.
	const [recoveryEmail, setRecoveryEmail] = useState("");
	const [recoveryCode, setRecoveryCode] = useState("");
	const [registerData, setRegisterData] = useState<{ firstName: string; lastName: string; email: string; referralCode: string } | null>(null);
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
	// Saldo e historial de puntos: antes vivían solo en memoria (se sumaban a
	// mano cuando alguien completaba el paso 2 con un código, y se restaban al
	// canjear). Ahora el backend es la fuente de verdad — ver src/services/pointsApi.ts
	// — así que estos dos estados son un espejo de lo que devuelve /points/me y
	// /points/history, no un contador que la app lleva por su cuenta.
	const [referralPoints, setReferralPoints] = useState<number>(0);
	const [referralHistory, setReferralHistory] = useState<PointsHistoryEntry[]>([]);
	const [redeemingReward, setRedeemingReward] = useState(false);

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
			// eslint-disable-next-line react-hooks/set-state-in-effect -- resets state in response to a prop change, not a fetch-on-mount pattern
			setOffers([]);
			return;
		}
		getOffers(session.token, 1, 50)
			.then((p) => setOffers(p.items))
			.catch(() => setOffers([]));
	}, [session]);

	// Registro silencioso: si el usuario ya habia dado permiso en una sesion
	// anterior, reengancha el token al volver a abrir la app (puede haber
	// cambiado, p. ej. tras una reinstalacion). Nunca pide permiso desde
	// aca — eso solo pasa cuando el usuario prende el switch en Perfil.
	useEffect(() => {
		if (!session) return;
		registerForPushNotifications(session.token, { requestPermission: false }).catch(() => {});
	}, [session]);

	const historyEntryFromTx = (tx: PointsTransactionResponse): PointsHistoryEntry => ({
		id: String(tx.id),
		icon:
			tx.reason === "REDEEM"
				? "gift-outline"
				: tx.reason === "REFERRAL_ACTIVATED"
					? "people"
					: tx.reason === "REFERRAL_RETAINED"
						? "heart-outline"
						: "people-outline",
		title: tx.description,
		date: new Date(tx.createdAt).toLocaleDateString("es-AR", {
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit",
		}),
		pts: tx.points,
	});

	// Saldo e historial de puntos viven en el backend (ver PRODUCT.md: antes
	// era frontend-only y se perdía al cerrar la app). Se traen apenas hay
	// sesión y se vuelven a pedir después de cada canje.
	const refreshPoints = async (token: string) => {
		try {
			const [balanceRes, historyRes] = await Promise.all([
				getPointsBalance(token),
				getPointsHistory(token),
			]);
			setReferralPoints(balanceRes.balance);
			setReferralHistory(historyRes.map(historyEntryFromTx));
		} catch {
			// Si el backend de puntos no responde, no rompemos el resto de la app:
			// el usuario simplemente ve 0 puntos y un historial vacío hasta que
			// se pueda reintentar (por ejemplo, al volver a la pestaña Puntos).
		}
	};

	useEffect(() => {
		if (!session) {
			// eslint-disable-next-line react-hooks/set-state-in-effect -- resets local point state in response to the session being cleared, not a fetch-on-mount pattern
			setReferralPoints(0);
			setReferralHistory([]);
			return;
		}
		refreshPoints(session.token);
	}, [session]);

	const goMain = (t: TabKey = "home") => { setTab(t); setScreen("main"); };

	useEffect(() => {
		// expo-notifications throws on import in Expo Go (Android), so it is
		// loaded lazily and only outside Expo Go.
		if (!canUsePush()) return;
		let cancelled = false;
		let sub: { remove: () => void } | undefined;
		loadNotifications()
			.then((Notifications) => {
				if (!Notifications || cancelled) return;
				Notifications.setNotificationHandler({
					handleNotification: async () => ({
						shouldShowBanner: true,
						shouldShowList: true,
						shouldPlaySound: true,
						shouldSetBadge: false,
					}),
				});
				sub = Notifications.addNotificationResponseReceivedListener((response) => {
					const data = response.notification.request.content.data as { screen?: string; ticketId?: string };
					if (data.screen === "ticketDetail" && data.ticketId) {
						setSelectedTicketId(Number(data.ticketId));
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
			})
			.catch(() => {});
		return () => {
			cancelled = true;
			sub?.remove();
		};
	}, []);

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
	const handleScanPress = () => { setTab("scan"); setScreen("captureTicket"); };
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

	const findOffer = (id: string | null) => resolveOffer(offers, id, fallbackOffer);
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
								alternativeBrandsEnabled: true,
								referralCode: "",
								points: 0,
								offersPushEnabled: true,
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
					onCancel={() => { setSelectedPdf(null); setScreen("captureTicket"); }}
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
						// El saldo posta vive en el backend: /points/redeem valida ahí
						// mismo que alcancen los puntos (409 si no) y devuelve el saldo
						// actualizado, en vez de restar optimista del lado del cliente
						// como antes (que podía desincronizarse si había otro canje en
						// paralelo, p. ej. en dos dispositivos con la misma cuenta).
						if (redeemingReward) return;
						const reward = findReward(selectedRewardId);
						setRedeemingReward(true);
						try {
							const result = await redeemReward(session.token, reward.id, reward.points);
							setReferralPoints(result.balance);
							setRedeemRemaining(result.balance);
							refreshPoints(session.token);
							setScreen("redeemSuccess");
						} catch (err) {
							setToastMessage(err instanceof Error ? err.message : "No se pudo canjear. Probá de nuevo.");
							setScreen("rewardDetail");
						} finally {
							setRedeemingReward(false);
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
					onBack={(msg) => { if (msg) setToastMessage(msg); goMain("profile"); }}
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
				<Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
			)}
			</OnboardingProvider>
		</SafeAreaProvider>
		</ThemePreferenceProvider>
	);
}
