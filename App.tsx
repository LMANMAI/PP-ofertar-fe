import { useState } from "react";

import { SafeAreaProvider } from "react-native-safe-area-context";

import {
	AuthLoginScreen,
	AuthWelcomeScreen,
	RegisterStep1,
	RegisterStep2,
} from "./src/screens";

export default function App() {
	const [screen, setScreen] = useState<
		"welcome" | "login" | "register1" | "register2" | "register3"
	>("welcome");

	return (
		<SafeAreaProvider>
			{screen === "welcome" && (
				<AuthWelcomeScreen
					onAlreadyHaveAccount={() => setScreen("login")}
					onCreateAccount={() => setScreen("register1")}
				/>
			)}

			{screen === "login" && (
				<AuthLoginScreen onBackPress={() => setScreen("welcome")} />
			)}

			{screen === "register1" && (
				<RegisterStep1
					onBack={() => setScreen("welcome")}
					onNext={() => setScreen("register2")}
				/>
			)}

			{screen === "register2" && (
				<RegisterStep2
					onBack={() => setScreen("register1")}
					onNext={() => setScreen("register3")}
				/>
			)}
		</SafeAreaProvider>
	);
}
