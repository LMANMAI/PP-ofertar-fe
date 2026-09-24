import React, { useMemo, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView,
	ActivityIndicator,
	type TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { InputField, PasswordStrengthBar } from "../components";
import { register } from "../services/authApi";
import type { Session } from "../auth/session";

// Keyboard focus ring (web); native ignores `focused`.
const isFocused = (state: unknown) => !!(state as { focused?: boolean }).focused;

type Props = {
	firstName: string;
	lastName: string;
	email: string;
	referralCode: string;
	onNext: (session: Session) => void;
	onBack: () => void;
	/** Offered when the email turns out to be registered already. */
	onGoToLogin?: () => void;
};

type ServerError = { kind: "emailTaken" | "generic"; message: string };

const RULE_LABELS = {
	minLength: "8 caracteres como mínimo",
	uppercase: "una mayúscula",
	number: "un número",
	special: "un carácter especial",
} as const;

function joinWithY(items: string[]): string {
	if (items.length <= 1) return items.join("");
	return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** The backend's own messages are already in Spanish; what needs translating
 * is what fetch throws when there is no connection, and the bare status
 * fallback when the server answers without a message. */
function toServerError(err: unknown): ServerError {
	const message = err instanceof Error ? err.message : "";
	if (/ya está registrado/i.test(message)) {
		return { kind: "emailTaken", message: "Ese correo ya tiene una cuenta." };
	}
	if (err instanceof TypeError || /network|fetch|failed to/i.test(message)) {
		return { kind: "generic", message: "No pudimos conectarnos. Revisá tu conexión y probá de nuevo." };
	}
	if (!message || /^Error del servidor/i.test(message)) {
		return { kind: "generic", message: "Algo salió mal de nuestro lado. Probá de nuevo en unos minutos." };
	}
	return { kind: "generic", message };
}

export default function RegisterStep2({ firstName, lastName, email, referralCode, onNext, onBack, onGoToLogin }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [password, setPassword] = useState("");
	const [repeatPassword, setRepeatPassword] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [serverError, setServerError] = useState<ServerError | null>(null);
	const [loading, setLoading] = useState(false);
	const passwordRef = useRef<TextInput>(null);
	const repeatRef = useRef<TextInput>(null);

	const passwordChecks = useMemo(
		() => ({
			minLength: password.length >= 8,
			uppercase: /[A-Z]/.test(password),
			number: /[0-9]/.test(password),
			special: /[^A-Za-z0-9]/.test(password),
			matches: password.length > 0 && password === repeatPassword,
		}),
		[password, repeatPassword],
	);

	const missingRules = (Object.keys(RULE_LABELS) as (keyof typeof RULE_LABELS)[])
		.filter((key) => !passwordChecks[key])
		.map((key) => RULE_LABELS[key]);
	const canContinue = missingRules.length === 0 && passwordChecks.matches;

	// Derived, so the messages update (and disappear) as the user fixes things.
	// The mismatch also shows while typing, but only once the repeat is as long
	// as the password: before that it would flash red on every keystroke.
	const passwordError = submitted && missingRules.length > 0 ? `Falta: ${joinWithY(missingRules)}` : undefined;
	const repeatError =
		repeatPassword.length === 0
			? submitted
				? "Repetí tu contraseña"
				: undefined
			: !passwordChecks.matches && (submitted || repeatPassword.length >= password.length)
				? "Las contraseñas no coinciden"
				: undefined;

	const handleRegister = async () => {
		if (loading) return;
		if (!canContinue) {
			setSubmitted(true);
			if (missingRules.length > 0) passwordRef.current?.focus();
			else repeatRef.current?.focus();
			return;
		}
		setServerError(null);
		setLoading(true);
		try {
			const name = `${firstName} ${lastName}`.trim();
			// Antes este código se pedía en el paso 1 y se descartaba acá: nunca
			// llegaba al backend, así que ningún referido se acreditaba de verdad.
			const authResponse = await register(
				name,
				email.trim(),
				password,
				referralCode || undefined,
			);
			onNext({ token: authResponse.token, user: authResponse.user });
		} catch (err) {
			setServerError(toServerError(err));
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={[styles.safeArea, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<View style={styles.headerLine}>
					<View style={styles.headerLeft}>
						<Pressable
							onPress={loading ? undefined : onBack}
							style={(state) => [styles.backButton, isFocused(state) && styles.focusRing]}
							hitSlop={8}
							accessibilityRole="button"
							accessibilityLabel="Volver"
							accessibilityState={{ disabled: loading }}
						>
							<Ionicons name="chevron-back" size={20} color={colors.buttonText} />
						</Pressable>
						<Text style={styles.headerTitle}>Registrarse</Text>
					</View>
					<Text style={styles.stepLabel}>Paso 2 de 2</Text>
				</View>
			</View>
			<View
				style={styles.progressWrap}
				accessibilityRole="progressbar"
				accessibilityLabel="Progreso del registro"
				accessibilityValue={{ min: 0, max: 2, now: 2, text: "Paso 2 de 2" }}
				aria-valuemin={0}
				aria-valuemax={2}
				aria-valuenow={2}
			>
				<View style={styles.progressTrack}>
					<View style={styles.progressFill} />
				</View>
			</View>

			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
			<ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
				<View style={styles.intro}>
					<Text style={styles.title} accessibilityRole="header">Elegí una contraseña</Text>
					<Text style={styles.subtitle}>
						Última parte: la contraseña protege tu cuenta y tus tickets.
					</Text>
				</View>

				<View style={styles.form}>
					<InputField
						label="Contraseña"
						value={password}
						onChangeText={(t) => {
								setPassword(t);
								setServerError(null);
							}}
						error={passwordError}
						inputRef={passwordRef}
						secureTextEntry
						editable={!loading}
						showPasswordToggle
						autoComplete="new-password"
						textContentType="newPassword"
						autoCapitalize="none"
						autoCorrect={false}
						returnKeyType="next"
						onSubmitEditing={() => repeatRef.current?.focus()}
					/>

					<PasswordStrengthBar
						minLength={passwordChecks.minLength}
						uppercase={passwordChecks.uppercase}
						number={passwordChecks.number}
						special={passwordChecks.special}
						matches={passwordChecks.matches}
					/>

					<InputField
						label="Repetí tu contraseña"
						value={repeatPassword}
						onChangeText={(t) => {
								setRepeatPassword(t);
								setServerError(null);
							}}
						error={repeatError}
						inputRef={repeatRef}
						secureTextEntry
						editable={!loading}
						showPasswordToggle
						autoComplete="new-password"
						textContentType="newPassword"
						autoCapitalize="none"
						autoCorrect={false}
						returnKeyType="done"
						onSubmitEditing={handleRegister}
					/>
				</View>
			</ScrollView>

			<View style={[styles.footer, { paddingBottom: insets.bottom + space.sm }]}>
				{serverError && (
					<View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
						<View style={styles.errorLine}>
							<Ionicons name="alert-circle" size={16} color={colors.dangerSoftText} />
							<Text style={styles.errorText}>{serverError.message}</Text>
						</View>
						{serverError.kind === "emailTaken" && (
							<View style={styles.errorActions}>
								{onGoToLogin && (
									<Pressable onPress={onGoToLogin} style={(state) => [styles.errorAction, isFocused(state) && styles.focusRing]} accessibilityRole="button" accessibilityLabel="Iniciar sesión">
										<Text style={styles.errorActionText}>Iniciar sesión</Text>
									</Pressable>
								)}
								<Pressable onPress={onBack} style={(state) => [styles.errorAction, isFocused(state) && styles.focusRing]} accessibilityRole="button" accessibilityLabel="Cambiar correo">
									<Text style={styles.errorActionText}>Cambiar correo</Text>
								</Pressable>
							</View>
						)}
					</View>
				)}

				<Pressable
					onPress={handleRegister}
					style={(state) => [
							styles.primaryButton,
							state.pressed && !loading && styles.primaryButtonPressed,
							loading && styles.primaryButtonLoading,
							isFocused(state) && styles.focusRing,
						]}
					accessibilityRole="button"
					accessibilityLabel="Crear cuenta"
					accessibilityState={{ busy: loading, disabled: loading }}
				>
					{loading ? (
						<ActivityIndicator size="small" color={colors.actionText} />
					) : (
						<Text style={styles.primaryButtonText}>Crear cuenta</Text>
					)}
				</Pressable>
			</View>
			</KeyboardAvoidingView>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.navy },
	header: {
		paddingHorizontal: space.md,
		paddingTop: space.md,
		paddingBottom: 0,
		backgroundColor: colors.navy,
	},
	headerLine: {
		width: "100%",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: space.sm,
	},
	headerLeft: { flexDirection: "row", alignItems: "center", gap: space.xs },
	backButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
	headerTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.subtitle,
	},
	stepLabel: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.overline,
		lineHeight: typography.lineHeights.overline,
		paddingRight: space.xs,
	},
	progressWrap: { backgroundColor: colors.navy },
	progressTrack: { height: 6, backgroundColor: colors.navyHairline, width: "100%" },
	progressFill: { height: 6, backgroundColor: colors.cyan, width: "100%" },
	container: {
		paddingHorizontal: space.xl,
		paddingTop: space.xxl,
		paddingBottom: space.xl,
		backgroundColor: colors.background,
		flexGrow: 1,
	},
	intro: { gap: space.xsPlus, paddingBottom: space.lg },
	title: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.h1,
		lineHeight: typography.lineHeights.h1,
	},
	subtitle: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.bodyL,
		lineHeight: typography.lineHeights.bodyL,
	},
	form: { gap: space.lg },
	footer: {
		paddingHorizontal: space.xl,
		paddingTop: space.md,
		gap: space.md,
		backgroundColor: colors.background,
		borderTopWidth: 1,
		borderTopColor: colors.divider,
	},
	primaryButton: {
		backgroundColor: colors.actionFill,
		height: 52,
		borderRadius: radii.sm + 2,
		alignItems: "center",
		justifyContent: "center",
	},
	
	primaryButtonPressed: { opacity: 0.9 },
	primaryButtonLoading: { opacity: 0.7 },
	primaryButtonText: {
		color: colors.actionText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.body,
		lineHeight: typography.lineHeights.label,
	},
	
	errorBox: { paddingVertical: space.smPlus, paddingHorizontal: space.md, borderRadius: radii.sm + 2, backgroundColor: colors.dangerSoft, gap: space.xs },
	errorLine: { flexDirection: "row", alignItems: "center", gap: space.sm },
	errorText: { flex: 1, color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption },
	errorActions: { flexDirection: "row", gap: space.lg },
	errorAction: { minHeight: 44, justifyContent: "center" },
	errorActionText: { color: colors.dangerSoftText, fontFamily: typography.family.bold, fontSize: typography.sizes.caption, textDecorationLine: "underline" },
		focusRing: { outlineWidth: 2, outlineColor: colors.actionFill, outlineOffset: 2, outlineStyle: "solid" },
		});
}
