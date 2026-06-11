import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useState } from "react";
import { InputField } from "../components";

import {
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, typography } from "../theme/designSystem";

type AuthLoginScreenProps = {
	onBackPress?: () => void;
};

export function AuthLoginScreen({ onBackPress }: AuthLoginScreenProps) {
	const insets = useSafeAreaInsets();
	const [fontsLoaded] = useFonts({
		PlusJakartaSans_400Regular,
		PlusJakartaSans_500Medium,
		PlusJakartaSans_700Bold,
	});
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
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
			{/* Fondo de la status bar — ocupa exactamente el alto del notch/status bar */}
			<View style={[styles.statusBarBg, { height: insets.top }]} />

			<View style={styles.topSection}>
				<StatusBar style="light" translucent />

				<View style={styles.header}>
					<Pressable onPress={onBackPress} style={styles.backButton}>
						<Text style={styles.backButtonText}>←</Text>
					</Pressable>
				</View>
			</View>

			<View style={[styles.content, { paddingBottom: insets.bottom }]}>
				<Text style={styles.title}>Iniciar sesión</Text>
				<Text style={styles.subtitle}>
					Ingresá a tu cuenta para seguir ahorrando
				</Text>

				<View style={styles.form}>
					<InputField
						label="Correo electrónico"
						leftIcon="✉"
						value={email}
						onChangeText={setEmail}
						keyboardType="email-address"
						autoCapitalize="none"
					/>

					<InputField
						label="Contraseña"
						leftIcon="🔒"
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						rightIcon="◌"
					/>
				</View>

				<Pressable style={styles.forgotButton}>
					<Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
				</Pressable>

				<Pressable
					style={({ pressed }) => [
						styles.primaryButton,
						pressed && styles.pressed,
					]}
				>
					<Text style={styles.primaryButtonText}>Iniciar sesión</Text>
				</Pressable>

				<View style={styles.dividerRow}>
					<View style={styles.dividerLine} />
					<Text style={styles.dividerText}>o continuá con</Text>
					<View style={styles.dividerLine} />
				</View>

				<Pressable
					style={({ pressed }) => [
						styles.googleButton,
						pressed && styles.pressed,
					]}
				>
					<Text style={styles.googleIcon}>G</Text>
					<Text style={styles.googleText}>Continuar con Google</Text>
				</Pressable>

				<Text style={styles.footerText}>
					¿No tenés cuenta?{" "}
					<Text style={styles.footerLink}>Registrate gratis</Text>
				</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.card,
		// Sin paddingTop — lo maneja el statusBarBg
	},
	statusBarBg: {
		backgroundColor: colors.navy,
	},
	loader: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.card,
	},
	topSection: {
		backgroundColor: colors.navy,
	},
	header: {
		height: 56,
		backgroundColor: colors.navy,
		justifyContent: "center",
		paddingHorizontal: 16,
	},
	backButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	backButtonText: {
		color: colors.buttonText,
		fontSize: 24,
		lineHeight: 24,
	},
	content: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 18,
		backgroundColor: colors.card,
	},
	title: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: 28,
		lineHeight: 36,
	},
	subtitle: {
		marginTop: 6,
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 17,
		lineHeight: 26,
	},
	form: {
		marginTop: 20,
		gap: 10,
	},
	label: {
		color: colors.mutedText,
		fontFamily: typography.family.medium,
		fontSize: 11,
		lineHeight: 14,
	},
	inputRow: {
		height: 42,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 6,
		backgroundColor: colors.card,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
	},
	inputRowFocused: {
		borderColor: colors.cyan,
		backgroundColor: colors.softCyan,
	},
	inputIcon: {
		width: 22,
		color: colors.mutedText,
		fontSize: 14,
	},
	input: {
		flex: 1,
		height: 42,
		color: colors.defaultText,
		fontFamily: typography.family.regular,
		fontSize: 14,
	},
	eyeIcon: {
		color: colors.mutedText,
		fontSize: 14,
	},
	forgotButton: {
		alignSelf: "flex-end",
		marginTop: 2,
	},
	forgotText: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: 12,
		lineHeight: 16,
		textDecorationLine: "underline",
	},
	primaryButton: {
		height: 42,
		borderRadius: 6,
		backgroundColor: colors.navy,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 8,
	},
	primaryButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 13,
		lineHeight: 16,
	},
	dividerRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginVertical: 6,
	},
	dividerLine: {
		flex: 1,
		height: 1,
		backgroundColor: colors.border,
	},
	dividerText: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 12,
		lineHeight: 16,
	},
	googleButton: {
		height: 42,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.card,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
	},
	googleIcon: {
		width: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: colors.softCyan,
		color: "#4285F4",
		overflow: "hidden",
		textAlign: "center",
		textAlignVertical: "center",
		fontFamily: typography.family.bold,
		fontSize: 12,
	},
	googleText: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: 13,
		lineHeight: 16,
	},
	footerText: {
		marginTop: 8,
		textAlign: "center",
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 12,
		lineHeight: 16,
	},
	footerLink: {
		color: colors.navy,
		fontFamily: typography.family.medium,
		textDecorationLine: "underline",
	},
	pressed: {
		opacity: 0.88,
	},
});
