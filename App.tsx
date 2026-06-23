import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import {
	AccountCreatedScreen,
	AuthLoginScreen,
	AuthWelcomeScreen,
	CaptureTicketScreen,
	ChangePasswordScreen,
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
import { LoadingOverlay } from "./src/components";
import { MOCK_USER, type MockSession } from "./src/auth/mockAuth";
import { sendOcrTicket, sendOcrTickets } from "./src/services";
import type { OCRResponse } from "./src/services";
import { OFFERS } from "./src/data/offers";
import { REWARDS } from "./src/data/rewards";

type Screen =
	| "welcome" | "login" | "register1" | "register2" | "loader"
	| "welcomeTransition" | "accountCreated" | "locationPermission"
	| "googleChoose" | "googleVerifying" | "googleFirstTime"
	| "passwordRecovery" | "checkEmail" | "changePassword" | "passwordSuccess"
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
	const [session, setSession] = useState<MockSession | null>(null);
	const [compareProduct, setCompareProduct] = useState<string>("Aceite Natura girasol 1.5L");
	const [selectedStore, setSelectedStore] = useState<string>("dia");
	const [compareOrigin, setCompareOrigin] = useState<"main" | "ticketProcessed">("main");
	const [activatedOfferIds, setActivatedOfferIds] = useState<Set<string>>(new Set());
	const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
	const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
	const [redeemCode, setRedeemCode] = useState<string>("DIA-X4K2-9WM7");

	const [selectedPdf, setSelectedPdf] = useState<{ name: string; base64: string } | null>(null);
	const [ocrResult, setOcrResult] = useState<OCRResponse | null>(null);
	const [ocrErrorMsg, setOcrErrorMsg] = useState<string>("");
	const [processingOcr, setProcessingOcr] = useState(false);
	const [processingFileType, setProcessingFileType] = useState<"pdf" | "image" | null>(null);

	const goMain = (t: TabKey = "home") => { setTab(t); setScreen("main"); };
	const handleScanPress = () => { setTab("scan"); setScreen("scanMethod"); };
	const handleSelectTab = (t: TabKey) => {
		if (t === "scan") return handleScanPress();
		setTab(t);
	};
	const handleLogout = () => {
		setSession(null); setTab("home"); setActivatedOfferIds(new Set()); setScreen("welcome");
	};

	const findOffer = (id: string | null) => OFFERS.find((o) => o.id === id) ?? OFFERS[0];
	const findReward = (id: string | null) => REWARDS.find((r) => r.id === id) ?? REWARDS[0];
	const generateCode = () =>
		`OFE-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

	const enterMain = () => {
		setSession({
			email: MOCK_USER.email,
			firstName: MOCK_USER.firstName,
			lastName: MOCK_USER.lastName,
			initials: MOCK_USER.firstName[0] + MOCK_USER.lastName[0],
		});
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

			setSelectedPdf({ name: asset.name ?? "ticket.pdf", base64 });
			setScreen("pdfConfirm");
		} catch (error) {
			setOcrErrorMsg(error instanceof Error ? error.message : "No se pudo leer el PDF");
			setScreen("scanError");
		}
	};

	const handleSendPhotos = async (photos: { id: string; uri: string; base64: string }[]) => {
		if (photos.length === 0) return;
		setProcessingFileType("image");
		setProcessingOcr(true);
		try {
			const result = await sendOcrTickets(photos.map((p) => p.base64));
			setOcrResult(result);
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
		if (!selectedPdf) return;
		setProcessingFileType("pdf");
		setProcessingOcr(true);
		try {
			const result = await sendOcrTicket("pdf", selectedPdf.base64);
			setOcrResult(result);
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
		setOcrResult(null);
		setOcrErrorMsg("");
		setSelectedPdf(null);
		setProcessingFileType(null);
		setScreen("scanMethod");
	};

	return (
		<SafeAreaProvider>
			{screen === "welcome" && (
				<AuthWelcomeScreen
					onAlreadyHaveAccount={() => setScreen("login")}
					onCreateAccount={() => setScreen("register1")}
				/>
			)}

			{screen === "login" && (
				<AuthLoginScreen
					onBackPress={() => setScreen("welcome")}
					onGoToRegister={() => setScreen("register1")}
					onLoginSuccess={(s) => { setSession(s); setScreen("loader"); }}
					onForgotPassword={() => setScreen("passwordRecovery")}
					onGoogleLogin={() => setScreen("googleChoose")}
				/>
			)}

			{screen === "register1" && (
				<RegisterStep1
					onBack={() => setScreen("welcome")}
					onNext={() => setScreen("register2")}
					onGoToLogin={() => setScreen("login")}
				/>
			)}

			{screen === "register2" && (
				<RegisterStep2
					onBack={() => setScreen("register1")}
					onNext={() => setScreen("accountCreated")}
				/>
			)}

			{screen === "accountCreated" && (
				<AccountCreatedScreen
					name={MOCK_USER.firstName}
					onStart={() => setScreen("locationPermission")}
				/>
			)}

			{screen === "locationPermission" && (
				<LocationPermissionScreen
					onAllow={() => setScreen("welcomeTransition")}
					onSkip={() => setScreen("welcomeTransition")}
				/>
			)}

			{screen === "welcomeTransition" && (
				<WelcomeTransitionScreen name={MOCK_USER.firstName} onDone={enterMain} />
			)}

			{screen === "loader" && (
				<LoaderScreen onDone={() => goMain("home")} />
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
					onComplete={() => setScreen("welcomeTransition")}
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

			{screen === "ticketProcessed" && (
				<TicketProcessedScreen
					ocrData={ocrResult ?? undefined}
					onBack={() => goMain("home")}
					onFinish={() => goMain("home")}
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
				/>
			)}

			{screen === "storeDetail" && (
				<StoreDetailScreen storeId={selectedStore} onBack={() => setScreen("compare")} />
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
				/>
			)}

			{screen === "offerCode" && selectedOfferId && (
				<OfferCodeScreen
					offer={{
						...findOffer(selectedOfferId),
						expiresAt: findOffer(selectedOfferId).expiresAtLabel,
					}}
					onBack={() => goMain("offers")}
				/>
			)}

			{screen === "rewardDetail" && selectedRewardId && (
				<RewardDetailScreen
					reward={findReward(selectedRewardId)}
					onBack={() => goMain("points")}
					onRedeem={() => setScreen("confirmRedeem")}
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
				/>
			)}

			{screen === "pointsHistory" && (
				<PointsHistoryScreen onBack={() => goMain("points")} />
			)}

			{screen === "loyaltyLevels" && (
				<LoyaltyLevelsScreen onBack={() => goMain("points")} />
			)}

			{screen === "personalData" && session && (
				<PersonalDataScreen session={session} onBack={() => goMain("profile")} />
			)}

			{screen === "paymentMethods" && (
				<PaymentMethodsScreen onBack={() => goMain("profile")} />
			)}

			{screen === "favoriteStores" && (
				<FavoriteStoresScreen onBack={() => goMain("profile")} />
			)}

			{screen === "helpCenter" && (
				<HelpCenterScreen onBack={() => goMain("profile")} />
			)}

			{screen === "logoutConfirm" && (
				<LogoutConfirmScreen
					onCancel={() => goMain("profile")}
					onConfirm={handleLogout}
				/>
			)}

			{screen === "ticketHistory" && (
				<TicketHistoryScreen
					onBack={() => goMain("home")}
					onSelectTicket={() => setScreen("ticketDetail")}
				/>
			)}

			{screen === "ticketDetail" && (
				<TicketDetailScreen onBack={() => setScreen("ticketHistory")} />
			)}

			{screen === "monthlyAnalysis" && (
				<MonthlyAnalysisScreen onBack={() => goMain("home")} />
			)}

			{screen === "recurringProducts" && (
				<RecurringProductsScreen onBack={() => goMain("home")} />
			)}

			{screen === "smartList" && (
				<SmartShoppingListScreen onBack={() => goMain("home")} />
			)}

			{processingOcr && processingFileType && (
				<LoadingOverlay fileType={processingFileType} />
			)}
		</SafeAreaProvider>
	);
}
