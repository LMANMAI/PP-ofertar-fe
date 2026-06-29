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
import { Ionicons } from "@expo/vector-icons";
import { InputField } from "../components";

import {
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, typography } from "../theme/designSystem";
import { login } from "../services/authApi";
import type { Session } from "../auth/session";

type AuthLoginScreenProps = {
	onBackPress?: () => void;
	onGoToRegister?: () => void;
	onLoginSuccess?: (session: Session) => void;
	onForgotPassword?: () => void;
	onGoogleLogin?: () => void;
};

export function AuthLoginScreen({
	onBackPress,
	onGoToRegister,
	onLoginSuccess,
	onForgotPassword,
	onGoogleLogin,
}: AuthLoginScreenProps) {
	const insets = useSafeAreaInsets();
	const [fontsLoaded] = useFonts({
		PlusJakartaSans_400Regular,
		PlusJakartaSans_500Medium,
		PlusJakartaSans_700Bold,
	});
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleLogin = async () => {
		setError(null);
		setLoading(true);
		try {
			const authResponse = await login(email.trim(), password);
			onLoginSuccess?.({ token: authResponse.token, user: authResponse.user });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al iniciar sesión");
		} finally {
			setLoading(false);
		}
	};

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
			<View style={styles.topSection}>
				<StatusBar style="light" translucent />
				<View style={styles.header}>
					<Pressable onPress={onBackPress} style={styles.backButton}>
						<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
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
						leftIcon=""
						value={email}
						onChangeText={setEmail}
						keyboardType="email-address"
						autoCapitalize="none"
					/>
					<InputField
						label="Contraseña"
						leftIcon=""
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						showPasswordToggle
					/>
				</View>

				{error && (
					<View style={styles.errorBox}>
						<Ionicons name="alert-circle" size={16} color="#A8341E" />
						<Text style={styles.errorText}>{error}</Text>
					</View>
				)}

				<Pressable style={styles.forgotButton} onPress={onForgotPassword}>
					<Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
				</Pressable>

				<Pressable
					onPress={loading ? undefined : handleLogin}
					style={({ pressed }) => [
						styles.primaryButton,
						pressed && !loading && styles.pressed,
						loading && { opacity: 0.55 },
					]}
				>
					{loading ? (
						<ActivityIndicator size="small" color={colors.buttonText} />
					) : (
						<Text style={styles.primaryButtonText}>Iniciar sesión</Text>
					)}
				</Pressable>

				<View style={styles.dividerRow}>
					<View style={styles.dividerLine} />
					<Text style={styles.dividerText}>o continuá con</Text>
					<View style={styles.dividerLine} />
				</View>

				<Pressable
					onPress={onGoogleLogin}
					style={({ pressed }) => [
						styles.googleButton,
						pressed && styles.pressed,
					]}
				>
					<Ionicons name="logo-google" size={18} color="#4285F4" />
					<Text style={styles.googleText}>Continuar con Google</Text>
				</Pressable>

				<Pressable onPress={onGoToRegister} style={styles.footerLinkWrap}>
					<Text style={styles.footerText}>
						¿No tenés cuenta?{" "}
						<Text style={styles.footerLink}>Registrate gratis</Text>
					</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.card },
	statusBarBg: { backgroundColor: colors.navy },
	loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
	topSection: { backgroundColor: colors.navy },
	header: { height: 56, backgroundColor: colors.navy, justifyContent: "center", paddingHorizontal: 12 },
	backButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
	content: { flex: 1, paddingHorizontal: 20, paddingTop: 24, backgroundColor: colors.card },
	title: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 28, lineHeight: 36 },
	subtitle: { marginTop: 6, color: colors.mutedText, fontFamily: typography.family.regular, fontSize: 17, lineHeight: 26 },
	form: { marginTop: 24, gap: 16 },
	errorBox: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#FDECEA", borderWidth: 1, borderColor: "#F5C1B8", flexDirection: "row", alignItems: "center", gap: 8 },
	errorText: { flex: 1, color: "#A8341E", fontFamily: typography.family.medium, fontSize: 13, lineHeight: 18 },
	forgotButton: { alignSelf: "flex-end", marginTop: 8 },
	forgotText: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: 13, lineHeight: 16, textDecorationLine: "underline" },
	primaryButton: { height: 52, borderRadius: 10, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", marginTop: 14 },
	primaryButtonText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15, lineHeight: 18 },
	dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 14 },
	dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
	dividerText: { color: colors.mutedText, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 16 },
	googleButton: { height: 52, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
	googleText: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 15, lineHeight: 18 },
	footerLinkWrap: { marginTop: 18, alignItems: "center" },
	footerText: { textAlign: "center", color: colors.mutedText, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 18 },
	footerLink: { color: colors.navy, fontFamily: typography.family.medium, textDecorationLine: "underline" },
	pressed: { opacity: 0.88 },
});
