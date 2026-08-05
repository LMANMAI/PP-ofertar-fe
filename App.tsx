import { useState, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import {
	AccountCreatedScreen,
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
	LoyaltyLevelsScreen,
	MonthlyAnalysisScreen,
	OfferCodeScreen,
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
import { LoadingOverlay, Toast } from "./src/components";
import { MOCK_USER } from "./src/auth/mockAuth";
import type { Session } from "./src/auth/session";
import { splitName } from "./src/auth/session";
import { storeToken, clearStoredToken, getStoredToken, getBiometricPreference, setBiometricPreference, getPromptDismissed, setPromptDismissed, isBiometricAvailable } from "./src/auth/biometricAuth";
import { scanTicket } from "./src/services";
import type { TicketResponse } from "./src/services";
import { OFFERS } from "./src/data/offers";
import { REWARDS } from "./src/data/rewards";
import { colors } from "./src/theme/designSystem";

type Screen =
	| "biometricLock" | "biometricPrompt" | "welcome" | "login" | "register1" | "register2" | "loader"
	| "welcomeTransition" | "accountCreated" | "locationPermission"
	| "googleChoose" | "googleVerifying" | "googleFirstTime"
	| "passwordRecovery" | "checkEmail" | "changePassword" | "passwordSuccess" | "changePasswordAuth"
	| "main"
	| "scanMethod" | "captureTicket" | "pdfConfirm" | "scanError" | "ticketProcessed"
	| "compare" | "storeDetail"
	| "offerDetail" | "offerCode"
	| "rewardDetail" | "confirmRedeem" | "redeemSuccess"
	| "pointsHistory" | "loyaltyLevels"
	| "personalData" | "paymentMethods" | "favoriteStores" | "helpCenter" | "logoutConfirm"
	| "ticketHistory" | "ticketDetail" | "monthlyAnalysis" | "recurringProducts" | "smartList";

export default function App() {
	const [screen, setScreen] = useState<Screen>("welcome");
	const [tab, setTab] = useState<TabKey>("home");
	const [session, setSession] = useState<Session | null>(null);
	const [registerData, setRegisterData] = useState<{ firstName: string; lastName: string; email: string; phone: string } | null>(null);
	const [compareProduct, setCompareProduct] = useState<string>("Aceite Natura girasol 1.5L");
	const [selectedStore, setSelectedStore] = useState<string>("dia");
	const [compareOrigin, setCompareOrigin] = useState<"main" | "ticketProcessed">("main");
	const [activatedOfferIds, setActivatedOfferIds] = useState<Set<string>>(new Set());
	const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
	const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
	const [redeemCode, setRedeemCode] = useState<string>("DIA-X4K2-9WM7");

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

	const goMain = (t: TabKey = "home") => { setTab(t); setScreen("main"); };
	const handleScanPress = () => { setTab("scan"); setScreen("scanMethod"); };
	const handleSelectTab = (t: TabKey) => {
		if (t === "scan") return handleScanPress();
		setTab(t);
		setScreen("main");
	};
	const handleLogout = () => {
		setSession(null); setTab("home"); setActivatedOfferIds(new Set()); setBiometricEnabled(false); setScreen("welcome");
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

	const findOffer = (id: string | null) => OFFERS.find((o) => o.id === id) ?? OFFERS[0];
	const findReward = (id: string | null) => REWARDS.find((r) => r.id === id) ?? REWARDS[0];
	const generateCode = () =>
		`OFE-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

	const enterMain = (ss: Session) => {
		setSession(ss);
		goMain("home");
	};

	const openOffer = (id: string) => { setSelectedOfferId(id); setScreen("offerDetail"); };
	const activateOffer = (id: string) => {
		setActivatedOfferIds((prev) => new Set(prev).add(id));
		setSelectedOfferId(id);
		setScreen("offerCode");
	};
	const showOfferCode = (id: string) => { setSelectedOfferId(id); setScreen("offerCode"); };

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

	const handleSendPhotos = async (photos: { id: string; uri: string; base64: string }[]) => {
		if (photos.length === 0 || !session) return;
		setProcessingFileType("image");
		setProcessingOcr(true);
		try {
			const ticket = await scanTicket(session.token, photos);
			setScannedTicket(ticket);
			setScreen("ticketProcessed");
		} catch (error) {
			setOcrErrorMsg(error instanceof Error ? error.message : "Error al procesar el ticket");
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
			const ticket = await scanTicket(
				session.token,
				[{ uri: selectedPdf.uri, base64: selectedPdf.base64 }],
				"application/pdf",
			);
			setScannedTicket(ticket);
			setSelectedPdf(null);
			setScreen("ticketProcessed");
		} catch (error) {
			setOcrErrorMsg(error instanceof Error ? error.message : "Error al procesar el PDF");
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
		<SafeAreaProvider>
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
					onNext={(s) => { setSession(s); setScreen("accountCreated"); }}
				/>
			)}

			{screen === "accountCreated" && session && (
				<AccountCreatedScreen
					name={splitName(session.user.name).firstName}
					onStart={() => setScreen("locationPermission")}
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
					onOpenHistory={() => setScreen("ticketHistory")}
					onOpenAnalysis={() => setScreen("monthlyAnalysis")}
					onOpenRecurring={() => setScreen("recurringProducts")}
					onOpenSmartList={() => setScreen("smartList")}
					onOpenOffer={openOffer}
					onActivateOffer={activateOffer}
				/>
			)}

			{screen === "main" && session && tab === "offers" && (
				<OffersScreen
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
					activatedIds={activatedOfferIds}
					onOpenOffer={openOffer}
					onActivateOffer={activateOffer}
					onShowCode={showOfferCode}
				/>
			)}

			{screen === "main" && session && tab === "points" && (
				<PointsScreen
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
					onSelectReward={(id) => { setSelectedRewardId(id); setScreen("rewardDetail"); }}
					onShowHistory={() => setScreen("pointsHistory")}
					onShowLevels={() => setScreen("loyaltyLevels")}
				/>
			)}

			{screen === "main" && session && tab === "profile" && (
				<ProfileScreen
					session={session}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
					onLogout={() => setScreen("logoutConfirm")}
					onOpenPersonalData={() => setScreen("personalData")}
					onOpenPayment={() => setScreen("paymentMethods")}
					onOpenStores={() => setScreen("favoriteStores")}
					onOpenSavings={() => setScreen("ticketHistory")}
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
					onBack={() => goMain("home")}
				/>
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
					onBack={() => goMain("home")}
					onFinish={() => goMain("home")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
					onSelectProduct={(name) => {
						setCompareProduct(name);
						setCompareOrigin("ticketProcessed");
						setScreen("compare");
					}}
				/>
			)}

			{screen === "scanError" && (
				<ScanErrorScreen
					errorMessage={ocrErrorMsg}
					onRetry={handleOcrRetry}
					onManualEntry={() => goMain("home")}
					onSeeOffers={() => goMain("offers")}
					onBack={() => goMain("home")}
				/>
			)}

			{screen === "compare" && (
				<ComparePricesScreen
					productName={compareProduct}
					onBack={() => {
						if (compareOrigin === "ticketProcessed") setScreen("ticketProcessed");
						else setScreen("main");
					}}
					onSelectStore={(storeId) => { setSelectedStore(storeId); setScreen("storeDetail"); }}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "storeDetail" && (
				<StoreDetailScreen
					storeId={selectedStore}
					onBack={() => setScreen("compare")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "offerDetail" && selectedOfferId && (
				<OfferDetailScreen
					offer={findOffer(selectedOfferId)}
					onBack={() => goMain("offers")}
					onActivate={() => {
						const id = selectedOfferId;
						if (id) setActivatedOfferIds((prev) => new Set(prev).add(id));
						setScreen("offerCode");
					}}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "offerCode" && selectedOfferId && (
				<OfferCodeScreen
					offer={{
						...findOffer(selectedOfferId),
						expiresAt: findOffer(selectedOfferId).expiresAtLabel,
					}}
					onBack={() => goMain("offers")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "rewardDetail" && selectedRewardId && (
				<RewardDetailScreen
					reward={findReward(selectedRewardId)}
					onBack={() => goMain("points")}
					onRedeem={() => setScreen("confirmRedeem")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "confirmRedeem" && selectedRewardId && (
				<ConfirmRedeemScreen
					reward={findReward(selectedRewardId)}
					onCancel={() => setScreen("rewardDetail")}
					onConfirm={() => { setRedeemCode(generateCode()); setScreen("redeemSuccess"); }}
				/>
			)}

			{screen === "redeemSuccess" && selectedRewardId && (
				<RedeemSuccessScreen
					reward={findReward(selectedRewardId)}
					code={redeemCode}
					onSeeMy={() => setScreen("pointsHistory")}
					onKeepRedeeming={() => goMain("points")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "pointsHistory" && (
				<PointsHistoryScreen
					onBack={() => goMain("points")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
				/>
			)}

			{screen === "loyaltyLevels" && (
				<LoyaltyLevelsScreen
					onBack={() => goMain("points")}
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

			{screen === "favoriteStores" && (
				<FavoriteStoresScreen
					onBack={() => goMain("profile")}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
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
					onSelectTicket={(id: number) => { setSelectedTicketId(id); setScreen("ticketDetail"); }}
					session={session}
					activeTab={tab}
					onSelectTab={handleSelectTab}
					onScanPress={handleScanPress}
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
		</SafeAreaProvider>
	);
}
