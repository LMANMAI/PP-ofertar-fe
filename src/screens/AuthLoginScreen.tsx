
import { StatusBar } from "expo-status-bar";
import {
	ActivityIndicator,
	Image,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	type TextInput,
} from "react-native";
import { useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { InputField } from "../components";


import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radii, space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { login } from "../services/authApi";
import { useBiometricInfo } from "../auth/biometricAuth";
import type { Session } from "../auth/session";

// Keyboard focus ring (web); native ignores `focused`.
const isFocused = (state: unknown) => !!(state as { focused?: boolean }).focused;

// Same rule and wording as RegisterStep1, so a typo is caught before the request.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_ERROR = "Revisá el correo: tiene que ser algo como nombre@correo.com";

/** What the user reads when login fails. Wrong credentials get one neutral
 * message on purpose (it must not say which of the two was wrong), and what
 * fetch throws offline is English text that needs translating. */
function toLoginError(err: unknown): string {
	const message = err instanceof Error ? err.message : "";
	if (err instanceof TypeError || /network|fetch|failed to/i.test(message)) {
		return "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.";
	}
	const status = /^Error del servidor \((\d{3})\)/i.exec(message)?.[1];
	if (status === "401" || status === "403" || /incorrectos?|credenciales/i.test(message)) {
		return "El correo o la contraseña no coinciden. Revisalos y probá de nuevo.";
	}
	if (!message || status) {
		return "Algo salió mal de nuestro lado. Probá de nuevo en unos minutos.";
	}
	return message;
}

type AuthLoginScreenProps = {
	onBackPress?: () => void;
	onGoToRegister?: () => void;
	onLoginSuccess?: (session: Session) => void;
	onForgotPassword?: () => void;
	/** Same shortcut the welcome screen offers, for people who reach login through "Ya tengo cuenta". */
	showBiometricButton?: boolean;
	onBiometricLogin?: () => void;
};

export function AuthLoginScreen({
	onBackPress,
	onGoToRegister,
	onLoginSuccess,
	onForgotPassword,
	showBiometricButton = false,
	onBiometricLogin,
}: AuthLoginScreenProps) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const biometric = useBiometricInfo();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
	const emailRef = useRef<TextInput>(null);
	const passwordRef = useRef<TextInput>(null);

	const handleLogin = async () => {
		const next: { email?: string; password?: string } = {};
		if (!email.trim()) next.email = "Ingresá tu correo electrónico";
		else if (!EMAIL_PATTERN.test(email.trim())) next.email = EMAIL_ERROR;
		if (!password) next.password = "Ingresá tu contraseña";
		setFieldErrors(next);
		if (next.email) {
			emailRef.current?.focus();
			return;
		}
		if (next.password) {
			passwordRef.current?.focus();
			return;
		}
		setError(null);
		setLoading(true);
		try {
			const authResponse = await login(email.trim(), password);
			onLoginSuccess?.({ token: authResponse.token, user: authResponse.user });
		} catch (err) {
			setError(toLoginError(err));
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<View style={styles.topSection}>
				<StatusBar style="light" />
				<View style={styles.header}>
					<Pressable
						onPress={onBackPress}
						style={(state) => [styles.backButton, isFocused(state) && styles.backFocusRing]}
						accessibilityRole="button"
						accessibilityLabel="Volver"
					>
						<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
					</Pressable>
					<Image
						source={require("../../assets/logo_ofertar.png")}
						style={styles.headerLogo}
						accessible={false}
					/>
					<Text style={styles.headerTitle} accessibilityLabel="OfertAR">
						Ofert<Text style={styles.headerAccent}>AR</Text>
					</Text>
				</View>
			</View>

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={insets.top}
			>
				<ScrollView
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode="on-drag"
				>
					<Text style={styles.title} accessibilityRole="header">Iniciar sesión</Text>
					<Text style={styles.subtitle}>
						Entrá para ver tus tickets y lo que te conviene comprar.
					</Text>

					<View style={styles.form}>
						<InputField
							label="Correo electrónico"
							value={email}
							onChangeText={(t) => {
								setEmail(t);
								setFieldErrors((prev) => (prev.email ? { ...prev, email: undefined } : prev));
							}}
							onBlur={() => {
								if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
									setFieldErrors((prev) => ({ ...prev, email: EMAIL_ERROR }));
								}
							}}
							error={fieldErrors.email}
							inputRef={emailRef}
							editable={!loading}
							keyboardType="email-address"
							autoCapitalize="none"
							autoCorrect={false}
							autoComplete="email"
							textContentType="emailAddress"
							returnKeyType="next"
							onSubmitEditing={() => passwordRef.current?.focus()}
						/>
						<InputField
							label="Contraseña"
							value={password}
							onChangeText={(t) => {
								setPassword(t);
								setFieldErrors((prev) => (prev.password ? { ...prev, password: undefined } : prev));
							}}
							error={fieldErrors.password}
							inputRef={passwordRef}
							editable={!loading}
							secureTextEntry
							showPasswordToggle
							autoCapitalize="none"
							autoCorrect={false}
							autoComplete="current-password"
							textContentType="password"
							returnKeyType="done"
							onSubmitEditing={loading ? undefined : handleLogin}
						/>
					</View>

					<Pressable
						style={(state) => [styles.forgotButton, isFocused(state) && styles.focusRing]}
						onPress={onForgotPassword}
						accessibilityRole="button"
						accessibilityLabel="¿Olvidaste tu contraseña?"
					>
						<Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
					</Pressable>
				</ScrollView>

				<View style={[styles.footer, { paddingBottom: insets.bottom + space.sm }]}>
					{error && (
						<View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
							<Ionicons name="alert-circle" size={16} color={colors.dangerSoftText} />
							<Text style={styles.errorText}>{error}</Text>
						</View>
					)}

					<Pressable
						onPress={loading ? undefined : handleLogin}
						style={(state) => [
							styles.primaryButton,
							state.pressed && !loading && styles.pressed,
							loading && { opacity: 0.55 },
							isFocused(state) && styles.focusRing,
						]}
						accessibilityRole="button"
						accessibilityLabel="Iniciar sesión"
						accessibilityState={{ busy: loading, disabled: loading }}
					>
						{loading ? (
							<ActivityIndicator size="small" color={colors.actionText} />
						) : (
							<Text style={styles.primaryButtonText}>Iniciar sesión</Text>
						)}
					</Pressable>

					{showBiometricButton && (
						<Pressable
							onPress={onBiometricLogin}
							style={(state) => [styles.secondaryButton, isFocused(state) && styles.focusRing]}
							accessibilityRole="button"
							accessibilityLabel={`Iniciar sesión con ${biometric.hint}`}
						>
							<Ionicons name={biometric.icon} size={18} color={colors.mutedText} />
							<Text style={styles.secondaryButtonText}>Entrar con {biometric.hint}</Text>
						</Pressable>
					)}

					<Pressable
						onPress={onGoToRegister}
						style={(state) => [styles.footerLinkWrap, isFocused(state) && styles.focusRing]}
						accessibilityRole="button"
						accessibilityLabel="¿No tenés cuenta? Registrate gratis"
					>
						<Text style={styles.footerText}>
							¿No tenés cuenta?{" "}
							<Text style={styles.footerLink}>Registrate gratis</Text>
						</Text>
					</Pressable>
				</View>
			</KeyboardAvoidingView>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },

	topSection: { backgroundColor: colors.navy },
	header: { height: 56, backgroundColor: colors.navy, alignItems: "center", flexDirection: "row", gap: space.sm, paddingHorizontal: space.sm },
	backButton: { width: 44, height: 44, borderRadius: radii.lg, alignItems: "center", justifyContent: "center" },
	headerLogo: { width: 24, height: 24, borderRadius: 6 },
	headerTitle: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: typography.sizes.subtitle },
	headerAccent: { color: colors.cyan },
	content: { flexGrow: 1, paddingHorizontal: space.xl, paddingTop: space.xxl, paddingBottom: space.xl, backgroundColor: colors.background },
	title: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.h1, lineHeight: typography.lineHeights.h1 },
	subtitle: { marginTop: space.xs, color: colors.mutedText, fontFamily: typography.family.regular, fontSize: typography.sizes.bodyL, lineHeight: typography.lineHeights.bodyL },
	// xxl (24) is a deliberate, larger break: title+subtitle are the screen's
	// intro, the form below is the actual task, and the gap should read as a
	// change of section, not just "next line."
	form: { marginTop: space.xxl, gap: space.lg },
	// Fixed at the bottom like the register steps, so the button is always in
	// the thumb zone and an error above it can't push it around.
	footer: {
		paddingHorizontal: space.xl,
		paddingTop: space.md,
		gap: space.sm,
		backgroundColor: colors.background,
		borderTopWidth: 1,
		borderTopColor: colors.divider,
	},
	errorBox: { paddingVertical: space.smPlus, paddingHorizontal: space.md, borderRadius: radii.sm + 2, backgroundColor: colors.dangerSoft, flexDirection: "row", alignItems: "center", gap: space.sm },
	errorText: { flex: 1, color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption },
	forgotButton: { alignSelf: "flex-end", marginTop: space.sm, minHeight: 44, justifyContent: "center" },
	forgotText: { color: colors.actionFill, fontFamily: typography.family.medium, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption, textDecorationLine: "underline" },
	primaryButton: { height: 52, borderRadius: radii.sm + 2, backgroundColor: colors.actionFill, alignItems: "center", justifyContent: "center" },
	primaryButtonText: { color: colors.actionText, fontFamily: typography.family.medium, fontSize: typography.sizes.body, lineHeight: typography.lineHeights.body },
	secondaryButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm },
	secondaryButtonText: { color: colors.mutedText, fontFamily: typography.family.medium, fontSize: typography.sizes.label, lineHeight: typography.lineHeights.label },
	footerLinkWrap: { alignItems: "center", justifyContent: "center", minHeight: 44 },
	footerText: { textAlign: "center", color: colors.mutedText, fontFamily: typography.family.regular, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption },
	footerLink: { color: colors.defaultText, fontFamily: typography.family.medium, textDecorationLine: "underline" },
	pressed: { opacity: 0.88 },
	focusRing: { outlineWidth: 2, outlineColor: colors.actionFill, outlineOffset: 2, outlineStyle: "solid" },
	// The header is navy in both themes, so the ring there must be cyan: the
	// actionFill ring is navy in light mode and vanished against it (1.00:1).
	backFocusRing: { outlineWidth: 2, outlineColor: colors.cyan, outlineOffset: 0, outlineStyle: "solid" },
	});
}
