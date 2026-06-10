import { AuthWelcomeScreen } from "./src/screens";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function App() {
	return (
		<SafeAreaProvider>
			<AuthWelcomeScreen />
		</SafeAreaProvider>
	);
}
