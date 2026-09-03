import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { InputField } from "../components";

import {
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { login } from "../services/authApi";
import type { Session } from "../auth/session";

type AuthLoginScreenProps = {
	onBackPress?: () => void;
	onGoToRegister?: () => void;
	onLoginSuccess?: (session: Session) => void;
	onForgotPassword?: () => void;
};

export function AuthLoginScreen({
	onBackPress,
	onGoToRegister,
	onLoginSuccess,
	onForgotPassword,
}: AuthLoginScreenProps) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
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
					<Pressable onPress={onBackPress} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
						<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
					</Pressable>
				</View>
			</View>

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={insets.top}
			>
				<ScrollView
					contentContainerStyle={[
						styles.content,
						{ paddingBottom: insets.bottom + 24 },
					]}
					keyboardShouldPersistTaps="handled"
				>
					<Text style={styles.title}>Iniciar sesión</Text>
					<Text style={styles.subtitle}>
						Ingresá a tu cuenta para seguir ahorrando
					</Text>

					<View style={styles.form}>
						<InputField
							label="Correo electrónico"
							value={email}
							onChangeText={setEmail}
							keyboardType="email-address"
							autoCapitalize="none"
						/>
						<InputField
							label="Contraseña"
							value={password}
							onChangeText={setPassword}
							secureTextEntry
							showPasswordToggle
						/>
					</View>

					{error && (
						<View style={styles.errorBox}>
							<Ionicons name="alert-circle" size={16} color={colors.dangerSoftText} />
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

					<Pressable onPress={onGoToRegister} style={styles.footerLinkWrap}>
						<Text style={styles.footerText}>
							¿No tenés cuenta?{" "}
							<Text style={styles.footerLink}>Registrate gratis</Text>
						</Text>
					</Pressable>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.card },
	statusBarBg: { backgroundColor: colors.navy },
	loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
	topSection: { backgroundColor: colors.navy },
	header: { height: 56, backgroundColor: colors.navy, justifyContent: "center", paddingHorizontal: space.md },
	backButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
	content: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.xxl, backgroundColor: colors.card },
	title: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 28, lineHeight: 36 },
	subtitle: { marginTop: space.xs, color: colors.mutedText, fontFamily: typography.family.regular, fontSize: 17, lineHeight: 26 },
	// xxl (24) is a deliberate, larger break: title+subtitle are the screen's
	// intro, the form below is the actual task, and the gap should read as a
	// change of section, not just "next line."
	form: { marginTop: space.xxl, gap: space.lg },
	errorBox: { marginTop: space.md, paddingVertical: 10, paddingHorizontal: space.md, borderRadius: 10, backgroundColor: colors.dangerSoft, flexDirection: "row", alignItems: "center", gap: space.sm },
	errorText: { flex: 1, color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: 13, lineHeight: 18 },
	forgotButton: { alignSelf: "flex-end", marginTop: space.sm },
	forgotText: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: 13, lineHeight: 16, textDecorationLine: "underline" },
	// lg (16), not the old ad hoc 14: the forgot-password link is a recovery
	// path, this button is the actual commit action — the gap between them
	// should read as a bigger break than the tight sibling spacing above it,
	// not a rounding error away from it.
	primaryButton: { height: 52, borderRadius: 10, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", marginTop: space.lg },
	primaryButtonText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15, lineHeight: 18 },
	// xl (20): the clearest break on the screen — everything above is the
	// login task, this is the exit to a different one.
	footerLinkWrap: { marginTop: space.xl, alignItems: "center" },
	footerText: { textAlign: "center", color: colors.mutedText, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 18 },
	footerLink: { color: colors.defaultText, fontFamily: typography.family.medium, textDecorationLine: "underline" },
	pressed: { opacity: 0.88 },
	});
}
