import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useThemeColors } from "../theme/designSystem";
import {
	BiometricLockRoute,
	BiometricPromptRoute,
	ChangePasswordRoute,
	CheckEmailRoute,
	LoaderRoute,
	LocationPermissionRoute,
	LoginRoute,
	PasswordRecoveryRoute,
	PasswordSuccessRoute,
	Register1Route,
	Register2Route,
	WelcomeRoute,
	WelcomeTransitionRoute,
} from "./routes/authRoutes";
import {
	CaptureTicketRoute,
	CompareRoute,
	FavoriteStoresRoute,
	HabitualPurchaseRoute,
	MainRoute,
	MonthlyAnalysisRoute,
	OfferDetailRoute,
	PdfConfirmRoute,
	RecurringProductsRoute,
	ScanBarcodeRoute,
	ScanErrorRoute,
	StoreDetailRoute,
	TicketDetailRoute,
	TicketHistoryRoute,
	TicketProcessedRoute,
} from "./routes/mainRoutes";
import {
	ChangePasswordAuthRoute,
	ConfirmRedeemRoute,
	HelpCenterRoute,
	LogoutConfirmRoute,
	PaymentMethodsRoute,
	PersonalDataRoute,
	PlansRoute,
	PointsHistoryRoute,
	PointsRoute,
	RedeemSuccessRoute,
	RewardDetailRoute,
} from "./routes/pointsProfileRoutes";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Todas las pantallas de la app. Para agregar una: su ruta en `routes/`, su nombre en `types.ts` y una línea acá. */
export function RootNavigator() {
	const colors = useThemeColors();
	return (
		<Stack.Navigator
			initialRouteName="Welcome"
			screenOptions={{
				headerShown: false,
				// Un fundido corto, como el que tenía la app antes de usar una librería de navegación.
				animation: "fade",
				animationDuration: 220,
				contentStyle: { backgroundColor: colors.background },
			}}
		>
			{/* Ingreso */}
			<Stack.Screen name="Welcome" component={WelcomeRoute} />
			<Stack.Screen name="Login" component={LoginRoute} />
			<Stack.Screen name="Register1" component={Register1Route} />
			<Stack.Screen name="Register2" component={Register2Route} />
			<Stack.Screen name="LocationPermission" component={LocationPermissionRoute} />
			<Stack.Screen name="WelcomeTransition" component={WelcomeTransitionRoute} />
			<Stack.Screen name="Loader" component={LoaderRoute} />
			<Stack.Screen name="BiometricLock" component={BiometricLockRoute} />
			<Stack.Screen name="BiometricPrompt" component={BiometricPromptRoute} />
			<Stack.Screen name="PasswordRecovery" component={PasswordRecoveryRoute} />
			<Stack.Screen name="CheckEmail" component={CheckEmailRoute} />
			<Stack.Screen name="ChangePassword" component={ChangePasswordRoute} />
			<Stack.Screen name="PasswordSuccess" component={PasswordSuccessRoute} />

			{/* Pestañas */}
			<Stack.Screen name="Main" component={MainRoute} />
			<Stack.Screen name="TicketHistory" component={TicketHistoryRoute} />
			<Stack.Screen name="CaptureTicket" component={CaptureTicketRoute} />

			{/* Tickets */}
			<Stack.Screen name="TicketDetail" component={TicketDetailRoute} />
			<Stack.Screen name="TicketProcessed" component={TicketProcessedRoute} />
			<Stack.Screen name="PdfConfirm" component={PdfConfirmRoute} />
			<Stack.Screen name="ScanError" component={ScanErrorRoute} />
			<Stack.Screen name="MonthlyAnalysis" component={MonthlyAnalysisRoute} />
			<Stack.Screen name="RecurringProducts" component={RecurringProductsRoute} />
			<Stack.Screen name="HabitualPurchase" component={HabitualPurchaseRoute} />

			{/* Códigos de barras, precios y ofertas */}
			<Stack.Screen name="ScanBarcode" component={ScanBarcodeRoute} />
			<Stack.Screen name="Compare" component={CompareRoute} />
			<Stack.Screen name="FavoriteStores" component={FavoriteStoresRoute} />
			<Stack.Screen name="StoreDetail" component={StoreDetailRoute} />
			<Stack.Screen name="OfferDetail" component={OfferDetailRoute} />

			{/* Puntos */}
			<Stack.Screen name="Points" component={PointsRoute} />
			<Stack.Screen name="RewardDetail" component={RewardDetailRoute} />
			<Stack.Screen name="ConfirmRedeem" component={ConfirmRedeemRoute} />
			<Stack.Screen name="RedeemSuccess" component={RedeemSuccessRoute} />
			<Stack.Screen name="PointsHistory" component={PointsHistoryRoute} />

			{/* Perfil */}
			<Stack.Screen name="PersonalData" component={PersonalDataRoute} />
			<Stack.Screen name="PaymentMethods" component={PaymentMethodsRoute} />
			<Stack.Screen name="Plans" component={PlansRoute} />
			<Stack.Screen name="HelpCenter" component={HelpCenterRoute} />
			<Stack.Screen name="ChangePasswordAuth" component={ChangePasswordAuthRoute} />
			<Stack.Screen name="LogoutConfirm" component={LogoutConfirmRoute} />
		</Stack.Navigator>
	);
}
