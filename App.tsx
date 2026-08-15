import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import {
	AuthLoginScreen,
	AuthWelcomeScreen,
	RegisterStep1,
	RegisterStep2,
	HomeScreen,
} from "./src/screens";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import type { Session } from "./src/auth/session";

export default function App() {
	const [screen, setScreen] = useState<
		| "onboarding"
		| "welcome"
		| "login"
		| "register1"
		| "register2"
		| "home"
		| "loading"
	>("loading");
	const [currentSession, setCurrentSession] = useState<Session | null>(null);
	const [pendingRegistration, setPendingRegistration] = useState<{
		firstName: string;
		lastName: string;
		email: string;
		phone: string;
	} | null>(null);

	useEffect(() => {
		// Start at welcome; onboarding will be shown after login/registration
		setScreen("welcome");
	}, []);

	const finishOnboarding = async () => {
		try {
			if (currentSession?.user?.id != null) {
				await SecureStore.setItemAsync(
					`onboardingSeen:${currentSession.user.id}`,
					"1",
				);
			}
		} catch {
			// ignore storage errors
		}
		setScreen("home");
	};

	const handleAuthSuccess = async (
		session: Session,
		forceOnboarding = false,
	) => {
		setCurrentSession(session);
		if (forceOnboarding) {
			setScreen("onboarding");
			return;
		}
		try {
			const seen = await SecureStore.getItemAsync(
				`onboardingSeen:${session.user.id}`,
			);
			setScreen(seen ? "home" : "onboarding");
		} catch {
			setScreen("home");
		}
	};

	if (screen === "loading") return <SafeAreaProvider />;

	return (
		<SafeAreaProvider>
			{screen === "onboarding" && (
				<OnboardingScreen onDone={finishOnboarding} />
			)}

			{screen === "welcome" && (
				<AuthWelcomeScreen
					onAlreadyHaveAccount={() => setScreen("login")}
					onCreateAccount={() => setScreen("register1")}
				/>
			)}

			{screen === "login" && (
				<AuthLoginScreen
					onBackPress={() => setScreen("welcome")}
					onLoginSuccess={(session) => handleAuthSuccess(session)}
				/>
			)}

			{screen === "register1" && (
				<RegisterStep1
					onBack={() => setScreen("welcome")}
					onNext={(data) => {
						setPendingRegistration(data);
						setScreen("register2");
					}}
				/>
			)}

			{screen === "register2" && (
				<RegisterStep2
					firstName={pendingRegistration?.firstName ?? ""}
					lastName={pendingRegistration?.lastName ?? ""}
					email={pendingRegistration?.email ?? ""}
					phone={pendingRegistration?.phone ?? ""}
					onBack={() => setScreen("register1")}
					onNext={(session) => {
						// After account creation, force showing onboarding for the new user
						setPendingRegistration(null);
						handleAuthSuccess(session, true);
					}}
				/>
			)}

			{screen === "home" && <HomeScreen />}
		</SafeAreaProvider>
	);
}
