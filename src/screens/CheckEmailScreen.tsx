import { useEffect, useMemo, useState } from "react";
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
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { InputField } from "../components";
import { friendlyAuthError, requestPasswordReset, verifyResetCode } from "../services/authApi";

type Props = {
	email: string;
	onBack: () => void;
	/** The code the server just accepted; the next step sends it again with the new password. */
	onVerified: (code: string) => void;
};

const CODE_LENGTH = 6;
// Matches the backend's resend cooldown: asking earlier is silently ignored there.
const RESEND_SECONDS = 60;

// Keyboard focus ring (web); native ignores `focused`.
const isFocused = (state: unknown) => !!(state as { focused?: boolean }).focused;

export function CheckEmailScreen({ email, onBack, onVerified }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [code, setCode] = useState("");
	const [codeError, setCodeError] = useState<string | undefined>();
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [resending, setResending] = useState(false);
	// The code was requested on the previous screen, so the wait already started.
	const [cooldown, setCooldown] = useState(RESEND_SECONDS);

	useEffect(() => {
		if (cooldown <= 0) return;
		const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
		return () => clearTimeout(id);
	}, [cooldown]);

	const busy = loading || resending;

	const handleVerify = async () => {
		if (busy) return;
		if (code.length !== CODE_LENGTH) {
			setCodeError(code ? `El código tiene ${CODE_LENGTH} dígitos` : "Ingresá el código que te enviamos");
			return;
		}
		setError(null);
		setNotice(null);
		setLoading(true);
		try {
			await verifyResetCode(email, code);
			onVerified(code);
		} catch (err) {
			setError(friendlyAuthError(err));
		} finally {
			setLoading(false);
		}
	};

	const handleResend = async () => {
		if (busy || cooldown > 0) return;
		setError(null);
		setNotice(null);
		setResending(true);
		try {
			await requestPasswordReset(email);
			setCode("");
			setCodeError(undefined);
			setCooldown(RESEND_SECONDS);
			setNotice("Si tu correo tiene una cuenta, te enviamos un código nuevo.");
		} catch (err) {
			setError(friendlyAuthError(err));
		} finally {
			setResending(false);
		}
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" />
			<View style={styles.header}>
				<Pressable
					onPress={busy ? undefined : onBack}
					style={(state) => [styles.backButton, isFocused(state) && styles.focusRing]}
					hitSlop={8}
					accessibilityRole="button"
					accessibilityLabel="Volver"
					accessibilityState={{ disabled: busy }}
				>
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
			</View>

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={insets.top}
			>
				<ScrollView
					contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode="on-drag"
				>
					<Text style={styles.title} accessibilityRole="header">Revisá tu correo</Text>
					<Text style={styles.subtitle}>
						Si <Text style={styles.bold}>{email}</Text> tiene una cuenta, te enviamos un código de {CODE_LENGTH} dígitos.
						Vence en 15 minutos.
					</Text>

					<View style={styles.form}>
						<InputField
							label="Código de 6 dígitos"
							value={code}
							onChangeText={(t) => {
								setCode(t.replace(/\D/g, "").slice(0, CODE_LENGTH));
								setCodeError(undefined);
								setError(null);
							}}
							error={codeError}
							editable={!busy}
							keyboardType="number-pad"
							autoCapitalize="none"
							autoCorrect={false}
							autoComplete="one-time-code"
							textContentType="oneTimeCode"
							returnKeyType="done"
							onSubmitEditing={handleVerify}
						/>
					</View>

					<Text style={styles.hint}>Si no lo ves, revisá la carpeta de spam o correo no deseado.</Text>

					{error && (
						<View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
							<Ionicons name="alert-circle" size={16} color={colors.dangerSoftText} />
							<Text style={styles.errorText}>{error}</Text>
						</View>
					)}
					{notice && (
						<View style={styles.noticeBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
							<Ionicons name="checkmark-circle" size={16} color={colors.successSoftText} />
							<Text style={styles.noticeText}>{notice}</Text>
						</View>
					)}

					<Pressable
						style={(state) => [
							styles.cta,
							loading && styles.ctaLoading,
							state.pressed && !busy && styles.pressed,
							isFocused(state) && styles.focusRing,
						]}
						onPress={handleVerify}
						disabled={busy}
						accessibilityRole="button"
						accessibilityLabel="Verificar código"
						accessibilityState={{ busy: loading, disabled: busy }}
					>
						{loading ? (
							<ActivityIndicator size="small" color={colors.actionText} />
						) : (
							<Text style={styles.ctaText}>Verificar código</Text>
						)}
					</Pressable>

					<Pressable
						onPress={handleResend}
						disabled={busy || cooldown > 0}
						style={(state) => [styles.resend, isFocused(state) && styles.focusRing]}
						accessibilityRole="button"
						accessibilityLabel={cooldown > 0 ? `Reenviar código, disponible en ${cooldown} segundos` : "Reenviar código"}
						accessibilityState={{ disabled: busy || cooldown > 0 }}
					>
						<Text style={[styles.resendText, cooldown > 0 && styles.resendTextWaiting]}>
							{resending ? "Enviando…" : cooldown > 0 ? `Reenviar código en ${cooldown} s` : "Reenviar código"}
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
		header: { backgroundColor: colors.navy, height: 56, paddingHorizontal: space.md, justifyContent: "center" },
		backButton: { width: 32, height: 32, borderRadius: radii.lg, alignItems: "center", justifyContent: "center" },
		content: { flexGrow: 1, paddingHorizontal: space.xl, paddingTop: space.xxl },
		title: {
			color: colors.defaultText,
			fontFamily: typography.family.bold,
			fontSize: typography.sizes.h1,
			lineHeight: typography.lineHeights.h1,
		},
		subtitle: {
			marginTop: space.xs,
			color: colors.mutedText,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.bodyL,
			lineHeight: typography.lineHeights.bodyL,
		},
		bold: { color: colors.defaultText, fontFamily: typography.family.medium },
		form: { marginTop: space.xxl },
		hint: {
			marginTop: space.sm,
			color: colors.mutedText,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
		},
		errorBox: {
			marginTop: space.md,
			paddingVertical: space.smPlus,
			paddingHorizontal: space.md,
			borderRadius: radii.sm + 2,
			backgroundColor: colors.dangerSoft,
			flexDirection: "row",
			alignItems: "center",
			gap: space.sm,
		},
		errorText: {
			flex: 1,
			color: colors.dangerSoftText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
		},
		noticeBox: {
			marginTop: space.md,
			paddingVertical: space.smPlus,
			paddingHorizontal: space.md,
			borderRadius: radii.sm + 2,
			backgroundColor: colors.successSoft,
			flexDirection: "row",
			alignItems: "center",
			gap: space.sm,
		},
		noticeText: {
			flex: 1,
			color: colors.successSoftText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
		},
		cta: {
			marginTop: space.lg,
			backgroundColor: colors.actionFill,
			height: 52,
			borderRadius: radii.sm + 2,
			alignItems: "center",
			justifyContent: "center",
		},
		ctaLoading: { opacity: 0.7 },
		ctaText: {
			color: colors.actionText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.body,
			lineHeight: typography.lineHeights.body,
		},
		resend: { marginTop: space.md, minHeight: 44, alignItems: "center", justifyContent: "center" },
		resendText: {
			color: colors.defaultText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
			textDecorationLine: "underline",
		},
		resendTextWaiting: { color: colors.mutedText, textDecorationLine: "none" },
		pressed: { opacity: 0.88 },
		focusRing: { outlineWidth: 2, outlineColor: colors.actionFill, outlineOffset: 2, outlineStyle: "solid" },
	});
}
