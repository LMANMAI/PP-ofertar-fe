import { useState } from "react";

import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthLoginScreen, AuthWelcomeScreen } from "./src/screens";

export default function App() {
	const [screen, setScreen] = useState<"welcome" | "login">("welcome");

	return (
		<SafeAreaProvider>
			{screen === "welcome" ? (
				<AuthWelcomeScreen onAlreadyHaveAccount={() => setScreen("login")} />
			) : (
				<AuthLoginScreen onBackPress={() => setScreen("welcome")} />
			)}
		</SafeAreaProvider>
	);
}
