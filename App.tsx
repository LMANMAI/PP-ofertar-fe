import { useFonts } from "expo-font";
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LoadingOverlay, OnboardingProvider, Toast } from "./src/components";
import { useAppBootstrap } from "./src/hooks/useAppBootstrap";
import { useNotificationTaps } from "./src/hooks/useNotificationTaps";
import { navigationRef } from "./src/navigation/nav";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { useScanStore, useSessionStore, useUiStore } from "./src/store";
import { colors, ThemePreferenceProvider, useIsDarkMode, useThemeColors } from "./src/theme/designSystem";

/** El tutorial de Inicio solo corre con sesión y con Inicio a la vista. */
function useOnboardingEligible(): boolean {
	const session = useSessionStore((s) => s.session);
	const tab = useUiStore((s) => s.tab);
	const route = useUiStore((s) => s.route);
	return Boolean(session && route === "Main" && tab === "home");
}

function AppShell() {
	useAppBootstrap();
	useNotificationTaps();

	const session = useSessionStore((s) => s.session);
	const booted = useSessionStore((s) => s.booted);
	const toastMessage = useUiStore((s) => s.toastMessage);
	const dismissToast = useUiStore((s) => s.dismissToast);
	const processingOcr = useScanStore((s) => s.processingOcr);
	const processingFileType = useScanStore((s) => s.processingFileType);
	const eligible = useOnboardingEligible();

	return (
		<OnboardingProvider
			eligible={eligible}
			userKey={session ? `${session.user.id}:${session.user.email.trim().toLowerCase()}` : null}
		>
			<RootNavigator />

			{!booted && (
				<View style={[StyleSheet.absoluteFill, { backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }]}>
					<ActivityIndicator size="small" color={colors.cyan} />
				</View>
			)}

			{processingOcr && processingFileType && <LoadingOverlay fileType={processingFileType} />}

			{toastMessage && <Toast message={toastMessage} onDismiss={dismissToast} />}
		</OnboardingProvider>
	);
}

/** Deja en uiStore qué pantalla está a la vista (el contenedor no la expone como estado de React fuera del navegador). */
function syncRoute() {
	useUiStore.getState().setRoute(navigationRef.getCurrentRoute()?.name ?? null);
}

/** El contenedor de navegación toma sus colores del tema de la app, así no hay destello blanco al cambiar de pantalla. */
function Navigation() {
	const themeColors = useThemeColors();
	const dark = useIsDarkMode();
	const base = dark ? DarkTheme : DefaultTheme;
	return (
		<NavigationContainer
			ref={navigationRef}
			// En web el contenedor cambia el título de la pestaña al nombre de la ruta; no hace falta.
			documentTitle={{ enabled: false }}
			onReady={syncRoute}
			onStateChange={syncRoute}
			theme={{ ...base, colors: { ...base.colors, background: themeColors.background, card: themeColors.background } }}
		>
			<AppShell />
		</NavigationContainer>
	);
}

export default function App() {
	// Preload once so each screen's own useFonts resolves from cache (no per-screen spinner).
	useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_700Bold });

	return (
		<ThemePreferenceProvider>
			<SafeAreaProvider>
				<Navigation />
			</SafeAreaProvider>
		</ThemePreferenceProvider>
	);
}
