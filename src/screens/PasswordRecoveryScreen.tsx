import { useMemo, useState } from "react";
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
import { PASSWORD_RECOVERY_ENABLED } from "../constants/features";
import { friendlyAuthError, requestPasswordReset } from "../services/authApi";

type Props = { onBack: () => void; onSent: (email: string) => void };

// Only catches typos before the round trip; the backend is the authority.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Keyboard focus ring (web); native ignores `focused`.
const isFocused = (state: unknown) => !!(state as { focused?: boolean }).focused;

export function PasswordRecoveryScreen({ onBack, onSent }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [email, setEmail] = useState("");
	const [emailError, setEmailError] = useState<string | undefined>();
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async () => {
		if (loading) return;
		const trimmed = email.trim();
		if (!EMAIL_PATTERN.test(trimmed)) {
			setEmailError(trimmed ? "Revisá el correo: tiene que ser algo como nombre@correo.com" : "Ingresá tu correo electrónico");
			return;
		}
		setError(null);
		setLoading(true);
		try {
			await requestPasswordReset(trimmed);
			onSent(trimmed);
		} catch (err) {
			setError(friendlyAuthError(err));
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" />
			<View style={styles.header}>
				<Pressable
					onPress={loading ? undefined : onBack}
					style={(state) => [styles.backButton, isFocused(state) && styles.focusRing]}
					hitSlop={8}
					accessibilityRole="button"
					accessibilityLabel="Volver"
					accessibilityState={{ disabled: loading }}
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
					<Text style={styles.title} accessibilityRole="header">Recuperá tu contraseña</Text>
					{!PASSWORD_RECOVERY_ENABLED ? (
						<>
							<View style={styles.soonBox} accessibilityRole="alert">
								<Ionicons name="time-outline" size={18} color={colors.infoSoftText} />
								<View style={styles.soonCopy}>
									<Text style={styles.soonTitle}>Disponible próximamente</Text>
									<Text style={styles.soonText}>
										Muy pronto vas a poder recuperar tu contraseña desde acá. Todavía no está disponible.
									</Text>
								</View>
							</View>
							<Pressable
								style={(state) => [styles.cta, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
								onPress={onBack}
								accessibilityRole="button"
								accessibilityLabel="Volver a iniciar sesión"
							>
								<Text style={styles.ctaText}>Volver a iniciar sesión</Text>
							</Pressable>
						</>
					) : (
					<>
					<Text style={styles.subtitle}>
						Ingresá tu correo y, si tiene una cuenta, te enviamos un código de 6 dígitos para cambiarla.
					</Text>

					<View style={styles.form}>
						<InputField
							label="Correo electrónico"
							value={email}
							onChangeText={(t) => {
								setEmail(t);
								setEmailError(undefined);
							}}
							error={emailError}
							editable={!loading}
							keyboardType="email-address"
							autoCapitalize="none"
							autoCorrect={false}
							autoComplete="email"
							textContentType="emailAddress"
							returnKeyType="done"
							onSubmitEditing={handleSubmit}
						/>
					</View>

					{error && (
						<View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
							<Ionicons name="alert-circle" size={16} color={colors.dangerSoftText} />
							<Text style={styles.errorText}>{error}</Text>
						</View>
					)}

					<Pressable
						style={(state) => [
							styles.cta,
							loading && styles.ctaLoading,
							state.pressed && !loading && styles.pressed,
							isFocused(state) && styles.focusRing,
						]}
						onPress={handleSubmit}
						disabled={loading}
						accessibilityRole="button"
						accessibilityLabel="Enviar código"
						accessibilityState={{ busy: loading, disabled: loading }}
					>
						{loading ? (
							<ActivityIndicator size="small" color={colors.actionText} />
						) : (
							<Text style={styles.ctaText}>Enviar código</Text>
						)}
					</Pressable>
					</>
					)}
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
		form: { marginTop: space.xxl },
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
		soonBox: {
			marginTop: space.xl,
			padding: space.md,
			borderRadius: radii.sm + 2,
			backgroundColor: colors.infoSoft,
			flexDirection: "row",
			alignItems: "flex-start",
			gap: space.sm,
		},
		soonCopy: { flex: 1, gap: 2 },
		soonTitle: {
			color: colors.infoSoftText,
			fontFamily: typography.family.bold,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
		},
		soonText: {
			color: colors.infoSoftText,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
		},
		pressed: { opacity: 0.88 },
		focusRing: { outlineWidth: 2, outlineColor: colors.actionFill, outlineOffset: 2, outlineStyle: "solid" },
	});
}
