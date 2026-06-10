import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import {
	ActivityIndicator,
	Image,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";

import {
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, typography } from "../theme/designSystem";

type AuthWelcomeScreenProps = {
	onAlreadyHaveAccount?: () => void;
};

export function AuthWelcomeScreen({
	onAlreadyHaveAccount,
}: AuthWelcomeScreenProps) {
	const insets = useSafeAreaInsets();
	const [fontsLoaded] = useFonts({
		PlusJakartaSans_400Regular,
		PlusJakartaSans_500Medium,
		PlusJakartaSans_700Bold,
	});

	if (!fontsLoaded) {
		return (
			<View
				style={[
					styles.safeArea,
					{ paddingTop: insets.top, paddingBottom: insets.bottom },
				]}
			>
				<StatusBar style="light" />
				<View style={styles.loader}>
					<ActivityIndicator size="small" color={colors.cyan} />
				</View>
			</View>
		);
	}

	return (
		<View
			style={[
				styles.safeArea,
				{ paddingTop: insets.top, paddingBottom: insets.bottom },
			]}
		>
			<StatusBar style="light" />

			<View style={styles.background}>
				<View style={styles.content}>
					<View style={styles.hero}>
						<Image
							source={require("../../assets/logo_ofertar.png")}
							style={styles.badgeIcon}
							resizeMode="cover"
						/>

						<Text style={styles.brandTitle}>
							Ofert<Text style={styles.brandAccent}>AR</Text>
						</Text>
						<Text style={styles.overline}>Tecnología en tus ahorros</Text>

						<Text style={styles.headline}>Pagá menos en cada compra.</Text>
						<Text style={styles.body}>
							Escaneá tus tickets y descubrí dónde encontrar tus productos de
							mejor precio.
						</Text>
					</View>
				</View>

				<View style={styles.footer}>
					<Pressable
						style={({ pressed }) => [
							styles.primaryButton,
							pressed && styles.pressed,
						]}
					>
						<Text style={styles.primaryButtonText}>Crear cuenta</Text>
					</Pressable>

					<Pressable
						onPress={onAlreadyHaveAccount}
						style={({ pressed }) => [
							styles.secondaryButton,
							pressed && styles.pressed,
						]}
					>
						<Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
					</Pressable>

					<Text style={styles.legalText}>
						Al continuar aceptás los términos y la política de privacidad.
					</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.navy,
	},
	background: {
		flex: 1,
		backgroundColor: colors.navy,
		paddingHorizontal: 24,
		paddingTop: 16,
		paddingBottom: 14,
		overflow: "hidden",
	},
	loader: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.navy,
	},
	topGlow: {
		position: "absolute",
		top: -120,
		right: -100,
		width: 240,
		height: 240,
		borderRadius: 240,
		backgroundColor: "rgba(125, 212, 245, 0.08)",
	},
	bottomGlow: {
		position: "absolute",
		bottom: -160,
		left: -120,
		width: 280,
		height: 280,
		borderRadius: 280,
		backgroundColor: "rgba(255, 255, 255, 0.03)",
	},
	topLabel: {
		color: "rgba(255, 255, 255, 0.46)",
		fontFamily: typography.family.regular,
		fontSize: 11,
		lineHeight: 14,
	},
	content: {
		flex: 1,
		justifyContent: "center",
	},
	hero: {
		maxWidth: 280,
		gap: 10,
	},
	badge: {
		width: 40,
		height: 40,
		borderRadius: 10,
		backgroundColor: "#0F2E66",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 6,
	},
	badgeIcon: {
		width: 64,
		height: 64,
		borderRadius: 7,
	},
	brandTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 18,
		lineHeight: 22,
	},
	brandAccent: {
		color: colors.cyan,
	},
	overline: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: 10,
		lineHeight: 12,
		letterSpacing: 2.1,
		textTransform: "uppercase",
		marginTop: 2,
	},
	headline: {
		marginTop: 8,
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 26,
		lineHeight: 30,
		letterSpacing: -0.7,
	},
	body: {
		marginTop: 2,
		color: "rgba(255, 255, 255, 0.58)",
		fontFamily: typography.family.regular,
		fontSize: 13,
		lineHeight: 19,
	},
	footer: {
		gap: 10,
	},
	primaryButton: {
		minHeight: 42,
		borderRadius: 4,
		backgroundColor: colors.orange,
		alignItems: "center",
		justifyContent: "center",
	},
	primaryButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 13,
		lineHeight: 16,
	},
	secondaryButton: {
		minHeight: 34,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: colors.orange,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent",
	},
	secondaryButtonText: {
		color: colors.orange,
		fontFamily: typography.family.medium,
		fontSize: 13,
		lineHeight: 16,
	},
	legalText: {
		marginTop: 2,
		color: "rgba(255, 255, 255, 0.35)",
		fontFamily: typography.family.regular,
		fontSize: 8,
		lineHeight: 12,
		textAlign: "left",
	},
	pressed: {
		opacity: 0.88,
	},
});
