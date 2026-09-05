import { useMemo } from "react";
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

import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
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
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
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
							Escaneá tus tickets o productos y descubrí dónde encontrar tus productos de
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

					<Text style={[styles.legalText, !showBiometricButton && styles.legalTextBreak]}>
						Al continuar aceptás los términos y la política de privacidad.
					</Text>
				</View>
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
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
		paddingHorizontal: space.xxl,
		paddingTop: space.smPlus,
		paddingBottom: space.smPlus,
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
		paddingBottom: space.xsPlus,
		gap: space.sm,
	},
	loader: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.navy,
	},
	hero: {
		maxWidth: 324,
		justifyContent: "center",
	},
	// No blanket gap here on purpose: the four elements below read as two
	// groups — a tight brand lockup (logo, name, tagline), then a clear break
	// into the actual pitch (headline, body) — so each gap is spelled out
	// explicitly rather than inherited from a container value that would
	// silently stack with these anyway.
	badgeIcon: {
		width: 84,
		height: 84,
		borderRadius: 7,
		marginBottom: space.md,
	},
	overline: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: 11,
		lineHeight: 14,
		letterSpacing: 2.2,
		textTransform: "uppercase",
		marginTop: space.xs,
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
		marginTop: space.xl,
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
		marginTop: space.sm,
		color: "rgba(255, 255, 255, 0.58)",
		fontFamily: typography.family.regular,
		fontSize: 17,
		lineHeight: 26,
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
		color: "rgba(255, 255, 255, 0.35)",
		fontFamily: typography.family.regular,
		fontSize: 10,
		lineHeight: 14,
		textAlign: "left",
	},
	// Only needed when the biometric row is absent: legalText then sits
	// directly under the CTA pair and needs the same "new group" break the
	// biometric button otherwise provides.
	legalTextBreak: {
		marginTop: space.md,
	},
	// The break before this tertiary action: primary/secondary are the
	// decision, this and the legal line are the footnote — grouped tight to
	// each other (the container's own gap.sm), separated from the CTAs above.
	biometricButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: space.sm,
		paddingVertical: space.sm,
		marginTop: space.md,
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
}
