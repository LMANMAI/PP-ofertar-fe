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
import { Ionicons } from "@expo/vector-icons";

type AuthWelcomeScreenProps = {
	onAlreadyHaveAccount?: () => void;
	onCreateAccount?: () => void;
	showBiometricButton?: boolean;
	onBiometricLogin?: () => void;
};

export function AuthWelcomeScreen({
	onAlreadyHaveAccount,
	onCreateAccount,
	showBiometricButton = false,
	onBiometricLogin,
}: AuthWelcomeScreenProps) {
	const insets = useSafeAreaInsets();
	const [fontsLoaded] = useFonts({
		PlusJakartaSans_400Regular,
		PlusJakartaSans_500Medium,
		PlusJakartaSans_700Bold,
	});

	if (!fontsLoaded) {
		return (
			<View style={styles.safeArea}>
				<View style={[styles.statusBarBg, { height: insets.top }]} />
				<StatusBar style="light" translucent />
				<View style={[styles.loader, { paddingBottom: insets.bottom }]}>
					<ActivityIndicator size="small" color={colors.cyan} />
				</View>
			</View>
		);
	}

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={[styles.background, { paddingBottom: insets.bottom }]}>
				<View style={styles.zoneTop} />

				<View style={styles.zoneHero}>
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

						<Text style={styles.headline}>
							Pagá menos en cada{" "}
							<Text style={styles.headlineAccent}>compra.</Text>
						</Text>
						<Text style={styles.body}>
							Escaneá tus tickets y descubrí dónde encontrar tus productos de
							mejor precio.
						</Text>
					</View>
				</View>

				<View style={styles.zoneMid} />

				<View style={styles.zoneCta}>
					<Pressable
						style={({ pressed }) => [
							styles.primaryButton,
							pressed && styles.pressed,
						]}
						onPress={onCreateAccount}
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

					{showBiometricButton && (
						<Pressable
							onPress={onBiometricLogin}
							style={({ pressed }) => [
								styles.biometricButton,
								pressed && { opacity: 0.6 },
							]}
						>
							<Ionicons name="finger-print-outline" size={16} color="rgba(255,255,255,0.45)" />
							<Text style={styles.biometricButtonText}>Iniciar con huella</Text>
						</Pressable>
					)}

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
	statusBarBg: {
		backgroundColor: colors.navy,
	},
	background: {
		flex: 1,
		backgroundColor: colors.navy,
		paddingHorizontal: 24,
		paddingTop: 10,
		paddingBottom: 10,
		overflow: "hidden",
	},
	zoneTop: {
		flex: 0.1,
	},
	zoneHero: {
		flex: 2,
		justifyContent: "center",
	},
	zoneMid: {
		flex: 1.1,
	},
	zoneCta: {
		paddingBottom: 6,
		gap: 10,
	},
	loader: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.navy,
	},
	hero: {
		maxWidth: 324,
		gap: 12,
		justifyContent: "center",
	},
	badgeIcon: {
		width: 84,
		height: 84,
		borderRadius: 7,
		marginBottom: 12,
	},
	overline: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: 11,
		lineHeight: 14,
		letterSpacing: 2.2,
		textTransform: "uppercase",
		marginTop: 2,
	},
	brandTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 28,
		lineHeight: 36,
	},
	brandAccent: {
		color: colors.cyan,
	},
	headline: {
		marginTop: 8,
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 36,
		lineHeight: 44,
		letterSpacing: -0.6,
	},
	headlineAccent: {
		color: colors.cyan,
	},
	body: {
		marginTop: 8,
		color: "rgba(255, 255, 255, 0.58)",
		fontFamily: typography.family.regular,
		fontSize: 17,
		lineHeight: 26,
	},
	footer: {
		gap: 10,
	},
	primaryButton: {
		height: 52,
		borderRadius: 14,
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
		height: 52,
		borderRadius: 14,
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
		fontSize: 10,
		lineHeight: 14,
		textAlign: "left",
	},
	biometricButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 8,
	},
	biometricButtonText: {
		color: "rgba(255,255,255,0.45)",
		fontFamily: typography.family.medium,
		fontSize: 13,
		lineHeight: 16,
	},
	pressed: {
		opacity: 0.88,
	},
});
