import type { NearbyStore } from "../services";

/**
 * Todas las pantallas de la app y los parámetros que reciben. Un `navigate` con un nombre o
 * parámetros incorrectos no compila. Las pantallas de sesión (Main, Points, Profile…) leen la
 * sesión del store, no de los parámetros.
 */
export type RootStackParamList = {
	// Ingreso
	Welcome: undefined;
	Login: undefined;
	Register1: undefined;
	Register2: undefined;
	LocationPermission: undefined;
	WelcomeTransition: undefined;
	Loader: undefined;
	BiometricLock: undefined;
	BiometricPrompt: undefined;
	PasswordRecovery: undefined;
	CheckEmail: undefined;
	ChangePassword: undefined;
	PasswordSuccess: undefined;

	// Con sesión: pestañas (Inicio, Ofertas y Perfil viven en Main, según uiStore.tab)
	Main: undefined;
	TicketHistory: undefined;
	CaptureTicket: undefined;

	// Tickets
	TicketDetail: { ticketId: number };
	TicketProcessed: undefined;
	PdfConfirm: undefined;
	ScanError: undefined;
	MonthlyAnalysis: undefined;
	RecurringProducts: undefined;
	HabitualPurchase: undefined;

	// Códigos de barras y precios
	ScanBarcode: undefined;
	Compare: { productName: string; barcode: string | null; origin: "main" | "ticketProcessed" };
	FavoriteStores: { from: "profile" | "scanBarcode" | "compare" };
	StoreDetail: { store: NearbyStore };
	OfferDetail: { offerId: string };

	// Puntos
	Points: undefined;
	RewardDetail: { rewardId: string };
	ConfirmRedeem: { rewardId: string };
	RedeemSuccess: { rewardId: string };
	PointsHistory: undefined;

	// Perfil
	PersonalData: undefined;
	PaymentMethods: undefined;
	Plans: undefined;
	HelpCenter: undefined;
	ChangePasswordAuth: undefined;
	LogoutConfirm: undefined;
};

export type RouteName = keyof RootStackParamList;
